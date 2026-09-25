import { z } from "zod";
import { messages } from "@/lib/messages";

// Task types and an airline's task types (CLAUDE.md, 5. mérföldkő).

const e = messages.taskTypes.errors;

export const TASK_TYPE_FIELDS = ["name", "code"] as const;
export type TaskTypeFormInput = Record<(typeof TASK_TYPE_FIELDS)[number], string>;

export const taskTypeSchema = z.object({
  name: z.string().trim().min(1, e.name).max(60, e.name),
  // A short code for the band view boxes, e.g. GOU or HDS.
  code: z
    .string()
    .trim()
    .toUpperCase()
    .pipe(z.string().regex(/^[A-Z0-9]{2,8}$/, e.code)),
});

/** One row of an airline's task types, as the form sends it. */
export interface AirlineTaskTypeRow {
  taskTypeId: string;
  /** Null when no template is chosen: the airline does not use the task type. */
  templateId: string | null;
  active: boolean;
}

/**
 * The rows of the airline form: "template:<taskTypeId>", "active:<taskTypeId>"
 * and one "primary" radio with a task type id.
 */
export function airlineTaskTypesFrom(formData: FormData, taskTypeIds: readonly string[]) {
  const rows: AirlineTaskTypeRow[] = taskTypeIds.map((taskTypeId) => {
    const template = formData.get(`template:${taskTypeId}`);
    return {
      taskTypeId,
      templateId: typeof template === "string" && template !== "" ? template : null,
      active: formData.get(`active:${taskTypeId}`) === "on",
    };
  });
  const primary = formData.get("primary");
  return { rows, primaryId: typeof primary === "string" && primary !== "" ? primary : null };
}

/**
 * The rules of an airline's task types: an active task type needs a template;
 * with any active task type, exactly one active one is primary. An airline
 * without active task types takes no flights, which is allowed.
 */
export function airlineTaskTypesError(rows: readonly AirlineTaskTypeRow[], primaryId: string | null): string | null {
  if (rows.some((row) => row.active && !row.templateId)) return e.templateRequired;
  const active = rows.filter((row) => row.active);
  if (active.length === 0) return primaryId && rows.some((row) => row.taskTypeId === primaryId) ? e.primaryInactive : null;
  if (!primaryId) return e.primaryMissing;
  if (!active.some((row) => row.taskTypeId === primaryId)) return e.primaryInactive;
  return null;
}
