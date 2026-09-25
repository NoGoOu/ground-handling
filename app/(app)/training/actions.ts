"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import { dayValue } from "@/lib/data/training";
import { removeTrainingFile, saveTrainingFile } from "@/lib/data/training-files";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { canManageTraining } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { resolveRecord } from "@/lib/training";
import { fieldErrors, formValues, type FormState } from "@/lib/validation/form";
import {
  COURSE_FIELDS,
  courseSchema,
  QUALIFICATION_FIELDS,
  qualificationSchema,
  RECORD_FIELDS,
  recordSchema,
  type CourseFormInput,
  type QualificationFormInput,
  type RecordFormInput,
} from "@/lib/validation/training";

// The coordinator's actions (CLAUDE.md, 6. mérföldkő): qualifications,
// trainings, records and their files. All need "Képzések kezelése".

const t = messages.training;

export type QualificationFormState = FormState<QualificationFormInput>;
export type CourseFormState = FormState<CourseFormInput>;
export type RecordFormState = FormState<RecordFormInput>;

async function coordinator() {
  const actor = await getCurrentUser();
  return actor && canManageTraining(actor) ? actor : null;
}

/** Which unique field a P2002 error is about. */
function taken(error: unknown, fields: readonly string[]): string | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return null;
  const meta = JSON.stringify(error.meta ?? {});
  return fields.find((field) => meta.includes(field)) ?? fields[0];
}

export async function saveQualification(
  id: string | null,
  _previous: QualificationFormState,
  formData: FormData,
): Promise<QualificationFormState> {
  if (!(await coordinator())) return { message: messages.errors.forbidden };
  const values = formValues(formData, QUALIFICATION_FIELDS);
  const parsed = qualificationSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  try {
    if (id) await prisma.qualification.update({ where: { id }, data: parsed.data });
    else await prisma.qualification.create({ data: parsed.data });
  } catch (error) {
    const field = taken(error, ["code", "name"]);
    if (field) return { errors: { [field]: field === "code" ? t.qualifications.errors.codeTaken : t.qualifications.errors.nameTaken }, values };
    throw error;
  }
  refresh();
  return id ? { notice: t.saved } : { notice: t.saved, values: { name: "", code: "", validityMonths: "", active: "on" } };
}

export async function saveCourse(id: string | null, _previous: CourseFormState, formData: FormData): Promise<CourseFormState> {
  if (!(await coordinator())) return { message: messages.errors.forbidden };
  const values = formValues(formData, COURSE_FIELDS);
  const parsed = courseSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  // An inactive qualification is not given out any more (approved decision 1); a course may keep its own.
  if (parsed.data.qualificationId) {
    const current = id ? await prisma.training.findUnique({ where: { id }, select: { qualificationId: true } }) : null;
    const qualification = await prisma.qualification.findUnique({
      where: { id: parsed.data.qualificationId },
      select: { active: true },
    });
    const keeps = current?.qualificationId === parsed.data.qualificationId;
    if (!qualification || (!qualification.active && !keeps)) {
      return { errors: { qualificationId: t.courses.errors.qualification }, values };
    }
  }
  try {
    if (id) await prisma.training.update({ where: { id }, data: parsed.data });
    else await prisma.training.create({ data: parsed.data });
  } catch (error) {
    if (taken(error, ["name"])) return { errors: { name: t.courses.errors.nameTaken }, values };
    throw error;
  }
  refresh();
  return id
    ? { notice: t.saved }
    : { notice: t.saved, values: { name: "", qualificationId: "", hasExam: "", passPercent: "" } };
}

type RecordData = Omit<Prisma.TrainingRecordUncheckedCreateInput, "userId" | "createdById">;

/** The record as stored: the rules of lib/training on the chosen training. */
async function recordData(
  parsed: ReturnType<typeof recordSchema.parse>,
): Promise<{ error: Record<string, string> } | { data: RecordData }> {
  const training = await prisma.training.findUnique({
    where: { id: parsed.trainingId },
    select: { hasExam: true, passPercent: true, qualification: { select: { validityMonths: true } } },
  });
  if (!training) return { error: { trainingId: t.records.errors.course } };
  const resolved = resolveRecord(
    {
      hasExam: training.hasExam,
      passPercent: training.passPercent,
      validityMonths: training.qualification ? training.qualification.validityMonths : undefined,
    },
    parsed,
  );
  if (resolved === "examRequired") return { error: { examPercent: t.records.errors.examRequired } };
  if (resolved === "noExam") return { error: { examPercent: t.records.errors.noExam } };
  return {
    data: {
      trainingId: parsed.trainingId,
      completedOn: dayValue(parsed.completedOn),
      examPercent: resolved.examPercent,
      passed: resolved.passed,
      validUntil: resolved.validUntil ? dayValue(resolved.validUntil) : null,
      validUntilManual: resolved.validUntilManual,
      note: parsed.note,
    },
  };
}

export async function createRecord(_previous: RecordFormState, formData: FormData): Promise<RecordFormState> {
  const actor = await coordinator();
  if (!actor) return { message: messages.errors.forbidden };
  const values = formValues(formData, RECORD_FIELDS);
  const parsed = recordSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const person = await prisma.user.findFirst({ where: { id: parsed.data.userId, teamId: { not: null } }, select: { id: true } });
  if (!person) return { errors: { userId: t.records.errors.person }, values };
  const result = await recordData(parsed.data);
  if ("error" in result) return { errors: result.error, values };

  const record = await prisma.trainingRecord.create({
    data: { ...result.data, userId: person.id, createdById: actor.id },
    select: { id: true },
  });
  redirect(`/training/records/${record.id}`);
}

/** Corrects a record: everything but the person (approved decision 5). Records are never deleted. */
export async function updateRecord(id: string, _previous: RecordFormState, formData: FormData): Promise<RecordFormState> {
  const actor = await coordinator();
  if (!actor) return { message: messages.errors.forbidden };
  const existing = await prisma.trainingRecord.findUnique({ where: { id }, select: { userId: true } });
  if (!existing) return { message: messages.errors.notFound };
  const values = { ...formValues(formData, RECORD_FIELDS), userId: existing.userId };
  const parsed = recordSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const result = await recordData(parsed.data);
  if ("error" in result) return { errors: result.error, values };

  await prisma.trainingRecord.update({ where: { id }, data: { ...result.data, updatedById: actor.id } });
  refresh();
  return { notice: t.saved };
}

export async function uploadRecordFile(recordId: string, _previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actionUser(canManageTraining);
    const record = await prisma.trainingRecord.findUnique({ where: { id: recordId }, select: { id: true } });
    if (!record) throw new ActionError(messages.errors.notFound);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new ActionError(t.files.errors.empty);
    const saved = await saveTrainingFile(recordId, file, actor.id);
    if (!saved.ok) throw new ActionError(t.files.errors[saved.problem]);
    refresh();
  });
}

export async function removeRecordFile(fileId: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actionUser(canManageTraining);
    if (!(await removeTrainingFile(fileId, actor.id))) throw new ActionError(messages.errors.notFound);
    refresh();
  });
}
