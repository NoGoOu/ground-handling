"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import { addCriterion, addSheetQuestion, moveCriterion, moveSheetQuestion, removeSheetQuestion, saveQuestion } from "@/lib/data/exams";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { canEditExams } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import {
  CRITERION_FIELDS,
  criterionSchema,
  parseQuestion,
  PARTS_FIELDS,
  partsProblem,
  partsSchema,
  QUESTION_FIELDS,
  SHEET_FIELDS,
  sheetSchema,
  type CriterionFormInput,
  type PartsFormInput,
  type QuestionFormInput,
  type SheetFormInput,
} from "@/lib/validation/exams";
import { fieldErrors, formValues, type FormState } from "@/lib/validation/form";

// Editing the exams (CLAUDE.md, 10. mérföldkő): the question bank, the exam
// sheets, the parts of a training with its OJT requirement, and the criteria
// of the practical exam. All need "Vizsgák szerkesztése".

const e = messages.exams;

export type QuestionFormState = FormState<QuestionFormInput>;
export type SheetFormState = FormState<SheetFormInput>;
export type PartsFormState = FormState<PartsFormInput>;
export type CriterionFormState = FormState<CriterionFormInput>;

async function editor() {
  const actor = await getCurrentUser();
  return actor && canEditExams(actor) ? actor : null;
}

export async function saveQuestionAction(id: string | null, _previous: QuestionFormState, formData: FormData): Promise<QuestionFormState> {
  if (!(await editor())) return { message: messages.errors.forbidden };
  const values = formValues(formData, QUESTION_FIELDS);
  const parsed = parseQuestion(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const saved = await saveQuestion(id, parsed.data);
  if (!saved) return { message: messages.errors.notFound, values };
  refresh();
  // A new question opens for editing; an edited one stays where it is.
  if (!id) redirect(`/training/exams/questions/${saved}?created=1`);
  return { notice: e.questions.saved };
}

/** A sheet belongs to a training with an exam: its pass mark decides the result. */
async function examTraining(trainingId: string) {
  const training = await prisma.training.findUnique({ where: { id: trainingId }, select: { hasExam: true, passPercent: true } });
  return training?.hasExam && training.passPercent !== null;
}

export async function saveSheetAction(id: string | null, _previous: SheetFormState, formData: FormData): Promise<SheetFormState> {
  if (!(await editor())) return { message: messages.errors.forbidden };
  const values = formValues(formData, SHEET_FIELDS);
  const parsed = sheetSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  if (!(await examTraining(parsed.data.trainingId))) return { errors: { trainingId: e.sheets.errors.training }, values };
  let savedId: string;
  try {
    savedId = id
      ? (await prisma.examSheet.update({ where: { id }, data: parsed.data })).id
      : (await prisma.examSheet.create({ data: parsed.data })).id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { errors: { name: e.sheets.errors.nameTaken }, values };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return { message: messages.errors.notFound };
    throw error;
  }
  refresh();
  if (!id) redirect(`/training/exams/sheets/${savedId}?created=1`);
  return { notice: e.sheets.saved };
}

export async function addSheetQuestionAction(sheetId: string, _previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canEditExams);
    const questionId = String(formData.get("questionId") ?? "");
    if (!questionId || !(await addSheetQuestion(sheetId, questionId))) throw new ActionError(e.sheets.errors.question);
    refresh();
  });
}

export async function removeSheetQuestionAction(entryId: string): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canEditExams);
    if (!(await removeSheetQuestion(entryId))) throw new ActionError(messages.errors.notFound);
    refresh();
  });
}

export async function moveSheetQuestionAction(entryId: string, direction: -1 | 1): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canEditExams);
    await moveSheetQuestion(entryId, direction);
    refresh();
  });
}

export async function savePartsAction(trainingId: string, _previous: PartsFormState, formData: FormData): Promise<PartsFormState> {
  if (!(await editor())) return { message: messages.errors.forbidden };
  const values = formValues(formData, PARTS_FIELDS);
  const parsed = partsSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const training = await prisma.training.findUnique({ where: { id: trainingId }, select: { hasExam: true, passPercent: true } });
  if (!training) return { message: messages.errors.notFound };
  const problem = partsProblem(parsed.data, training);
  if (problem) return { errors: { theoryPart: e.course.errors[problem] }, values };
  await prisma.training.update({ where: { id: trainingId }, data: parsed.data });
  refresh();
  return { notice: e.course.saved };
}

export async function addCriterionAction(trainingId: string, _previous: CriterionFormState, formData: FormData): Promise<CriterionFormState> {
  if (!(await editor())) return { message: messages.errors.forbidden };
  const values = formValues(formData, CRITERION_FIELDS);
  const parsed = criterionSchema.safeParse({ ...values, active: "on" });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const training = await prisma.training.findUnique({ where: { id: trainingId }, select: { id: true } });
  if (!training) return { message: messages.errors.notFound };
  await addCriterion(trainingId, parsed.data.text);
  refresh();
  return { notice: e.course.saved, values: { text: "", active: "on" } };
}

export async function saveCriterionAction(id: string, _previous: CriterionFormState, formData: FormData): Promise<CriterionFormState> {
  if (!(await editor())) return { message: messages.errors.forbidden };
  const values = formValues(formData, CRITERION_FIELDS);
  const parsed = criterionSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const updated = await prisma.practicalCriterion.updateMany({ where: { id }, data: parsed.data });
  if (updated.count === 0) return { message: messages.errors.notFound };
  refresh();
  return { notice: e.course.saved };
}

export async function moveCriterionAction(id: string, direction: -1 | 1): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canEditExams);
    await moveCriterion(id, direction);
    refresh();
  });
}
