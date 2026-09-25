import { prisma } from "@/lib/db";

// Task types (CLAUDE.md, 5. mérföldkő). Everything made before them belongs to
// the "Alap" task type; the migration creates it, and so does the seed.

export const BASE_TASK_TYPE = { name: "Alap", code: "ALAP" } as const;

/** The id of the "Alap" task type, made when it is missing. */
export async function baseTaskTypeId(): Promise<string> {
  const type = await prisma.taskType.upsert({
    where: { code: BASE_TASK_TYPE.code },
    create: BASE_TASK_TYPE,
    update: {},
    select: { id: true },
  });
  return type.id;
}

/**
 * The template of the airline's primary, active task type: what the airline's
 * default template was before the task types (3. mérföldkő). Null when there is none.
 */
export async function primaryTemplateIds(): Promise<Map<string, string>> {
  const rows = await prisma.airlineTaskType.findMany({
    where: { isPrimary: true, active: true },
    select: { airlineId: true, templateId: true },
  });
  return new Map(rows.map((row) => [row.airlineId, row.templateId]));
}
