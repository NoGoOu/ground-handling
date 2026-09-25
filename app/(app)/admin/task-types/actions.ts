"use server";

import { refresh } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { canManageAirlines } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { fieldErrors, formValues, type FormState } from "@/lib/validation/form";
import { TASK_TYPE_FIELDS, taskTypeSchema, type TaskTypeFormInput } from "@/lib/validation/task-type";

// Task types (CLAUDE.md, 5. mérföldkő): the admin creates and renames them.
// They are never deleted: tasks and templates point at them.

export type TaskTypeFormState = FormState<TaskTypeFormInput>;

const e = messages.taskTypes.errors;

/** Which unique field a P2002 error is about. */
function takenField(error: unknown): "name" | "code" | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return null;
  return JSON.stringify(error.meta ?? {}).includes("code") ? "code" : "name";
}

async function save(id: string | null, formData: FormData): Promise<TaskTypeFormState> {
  const actor = await getCurrentUser();
  if (!actor || !canManageAirlines(actor)) return { message: messages.errors.forbidden };
  const values = formValues(formData, TASK_TYPE_FIELDS);
  const parsed = taskTypeSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  try {
    if (id) await prisma.taskType.update({ where: { id }, data: parsed.data });
    else await prisma.taskType.create({ data: parsed.data });
  } catch (error) {
    const field = takenField(error);
    if (field) return { errors: { [field]: field === "code" ? e.codeTaken : e.nameTaken }, values };
    throw error;
  }
  refresh();
  return id ? { notice: messages.taskTypes.saved } : { notice: messages.taskTypes.saved, values: { name: "", code: "" } };
}

export async function createTaskType(_previous: TaskTypeFormState, formData: FormData): Promise<TaskTypeFormState> {
  return save(null, formData);
}

export async function updateTaskType(
  id: string,
  _previous: TaskTypeFormState,
  formData: FormData,
): Promise<TaskTypeFormState> {
  return save(id, formData);
}
