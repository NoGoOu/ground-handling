"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import { baseTaskTypeId } from "@/lib/data/task-types";
import { prisma } from "@/lib/db";
import { DEMO_MILESTONES, DEMO_TEMPLATE_PARAMS } from "@/lib/demo-template";
import { messages } from "@/lib/messages";
import { canManageAirlines } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { ATA_CODE, ATD_CODE } from "@/lib/turnaround";
import { fieldErrors, formValues, type FormState } from "@/lib/validation/form";
import {
  insertIndex,
  isLockedCode,
  LOCKED_MILESTONES,
  MILESTONE_FIELDS,
  milestoneSchema,
  moveInOrder,
  TEMPLATE_FIELDS,
  templateNameSchema,
  templateSchema,
  templateStructureError,
  type MilestoneData,
  type TemplateFormInput,
} from "@/lib/validation/template";

// Template changes apply to every task that is not completed (tasks read the live
// template); completed tasks keep their snapshot.

const e = messages.templateForm.errors;

export type TemplateFormState = FormState<TemplateFormInput>;
export type TemplateCreateState = FormState<{ name: string }>;

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user && canManageAirlines(user);
}

export async function createTemplate(
  airlineId: string,
  _previous: TemplateCreateState,
  formData: FormData,
): Promise<TemplateCreateState> {
  if (!(await isAdmin())) return { message: messages.errors.forbidden };
  const values = formValues(formData, ["name"]);
  const name = templateNameSchema.safeParse(values.name);
  if (!name.success) return { errors: { name: e.name }, values };

  // A new template starts with the demo parameters and the two system milestones.
  const systemMilestones = DEMO_MILESTONES.filter((m) => isLockedCode(m.code)).map((m, i) => ({ ...m, order: i + 1 }));
  let templateId: string;
  try {
    const template = await prisma.turnaroundTemplate.create({
      data: {
        airlineId,
        taskTypeId: await baseTaskTypeId(),
        name: name.data,
        ...DEMO_TEMPLATE_PARAMS,
        milestones: { create: systemMilestones },
      },
    });
    templateId = template.id;
  } catch (error) {
    if (isUniqueViolation(error)) return { errors: { name: e.nameTaken }, values };
    throw error;
  }
  redirect(`/admin/templates/${templateId}`);
}

export async function updateTemplate(
  templateId: string,
  _previous: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  if (!(await isAdmin())) return { message: messages.errors.forbidden };
  const values = formValues(formData, TEMPLATE_FIELDS);
  const parsed = templateSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  try {
    await prisma.turnaroundTemplate.update({ where: { id: templateId }, data: parsed.data });
  } catch (error) {
    if (isUniqueViolation(error)) return { errors: { name: e.nameTaken }, values };
    throw error;
  }
  refresh();
  return { notice: messages.form.saved };
}

async function loadMilestones(templateId: string) {
  return prisma.milestoneDefinition.findMany({ where: { templateId }, orderBy: { order: "asc" } });
}

/** Validates the whole list before anything is written. */
function assertStructure(milestones: Parameters<typeof templateStructureError>[0]) {
  const error = templateStructureError(milestones);
  if (error) throw new ActionError(error);
}

async function writeOrder(tx: Prisma.TransactionClient, ids: string[]) {
  for (const [index, id] of ids.entries()) {
    await tx.milestoneDefinition.update({ where: { id }, data: { order: index + 1 } });
  }
}

function parseMilestone(formData: FormData, lockedCode?: string): MilestoneData {
  const values = formValues(formData, MILESTONE_FIELDS);
  const locked = lockedCode ? LOCKED_MILESTONES[lockedCode] : undefined;
  // The locked fields of ATA / ATD are not editable, whatever the request says.
  const input = locked
    ? {
        ...values,
        code: lockedCode!,
        anchor: locked.anchor,
        offsetMinutes: String(locked.offsetMinutes),
        required: locked.required ? "on" : "",
        part: locked.part,
      }
    : values;
  const parsed = milestoneSchema.safeParse(input);
  if (!parsed.success) throw new ActionError(Object.values(fieldErrors(parsed.error))[0]);
  return parsed.data;
}

export async function updateMilestone(
  templateId: string,
  milestoneId: string,
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canManageAirlines);
    const milestones = await loadMilestones(templateId);
    const target = milestones.find((m) => m.id === milestoneId);
    if (!target) throw new ActionError(messages.errors.notFound);

    const data = parseMilestone(formData, isLockedCode(target.code) ? target.code : undefined);
    assertStructure(milestones.map((m) => (m.id === milestoneId ? { ...m, ...data } : m)));
    await prisma.milestoneDefinition.update({ where: { id: milestoneId }, data });
    refresh();
  });
}

export async function addMilestone(
  templateId: string,
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canManageAirlines);
    const milestones = await loadMilestones(templateId);
    const data = parseMilestone(formData);

    const index = insertIndex(milestones, data.part);
    const NEW = "__new__";
    const ids = milestones.map((m) => m.id);
    ids.splice(index, 0, NEW);
    const candidate = [...milestones, { ...data, id: NEW, order: 0 }].map((m) => ({ ...m, order: ids.indexOf(m.id) + 1 }));
    assertStructure(candidate);

    await prisma.$transaction(async (tx) => {
      const created = await tx.milestoneDefinition.create({ data: { ...data, templateId, order: index + 1 } });
      await writeOrder(tx, ids.map((id) => (id === NEW ? created.id : id)));
    });
    refresh();
  });
}

export async function moveMilestone(
  templateId: string,
  milestoneId: string,
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canManageAirlines);
    const direction = formData.get("direction");
    if (direction !== "up" && direction !== "down") throw new ActionError(messages.errors.invalidInput);

    const milestones = await loadMilestones(templateId);
    const ids = moveInOrder(milestones, milestoneId, direction);
    assertStructure(milestones.map((m) => ({ ...m, order: ids.indexOf(m.id) + 1 })));
    await prisma.$transaction((tx) => writeOrder(tx, ids));
    refresh();
  });
}

export async function deleteMilestone(templateId: string, milestoneId: string): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canManageAirlines);
    const milestones = await loadMilestones(templateId);
    const target = milestones.find((m) => m.id === milestoneId);
    if (!target) throw new ActionError(messages.errors.notFound);
    if (target.code === ATA_CODE || target.code === ATD_CODE) throw new ActionError(e.lockedMilestone);
    // Decision 4 (CLAUDE.md): milestones with records are kept.
    if ((await prisma.milestoneRecord.count({ where: { milestoneDefinitionId: milestoneId } })) > 0) {
      throw new ActionError(e.hasRecords);
    }

    const remaining = milestones.filter((m) => m.id !== milestoneId);
    await prisma.$transaction(async (tx) => {
      await tx.milestoneDefinition.delete({ where: { id: milestoneId } });
      await writeOrder(tx, remaining.map((m) => m.id));
    });
    refresh();
  });
}
