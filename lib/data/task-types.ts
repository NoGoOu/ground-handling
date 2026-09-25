import { prisma } from "@/lib/db";
import { tasksForNewFlight, type AirlineTaskTypeSpec, type TaskSpec } from "@/lib/task-types";

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

/** The tasks a new flight of each airline gets (lib/task-types); airlines without an active task type are missing. */
export async function newFlightTasksByAirline(airlineId?: string): Promise<Map<string, TaskSpec[]>> {
  const rows = await prisma.airlineTaskType.findMany({
    where: airlineId ? { airlineId } : {},
    select: {
      airlineId: true,
      taskTypeId: true,
      templateId: true,
      active: true,
      isPrimary: true,
      taskType: { select: { code: true } },
    },
  });
  const byAirline = new Map<string, AirlineTaskTypeSpec[]>();
  for (const row of rows) {
    const list = byAirline.get(row.airlineId) ?? [];
    list.push({ ...row, code: row.taskType.code });
    byAirline.set(row.airlineId, list);
  }
  const tasks = new Map<string, TaskSpec[]>();
  for (const [id, types] of byAirline) {
    const specs = tasksForNewFlight(types);
    if (specs.length > 0) tasks.set(id, specs);
  }
  return tasks;
}

/** The airlines a flight may be made for: those with an active task type. */
export async function listAirlineOptions() {
  const airlines = await prisma.airline.findMany({
    where: { taskTypes: { some: { active: true } } },
    select: { id: true, name: true, iataCode: true },
    orderBy: { name: "asc" },
  });
  return airlines.map((airline) => ({ id: airline.id, label: `${airline.name} (${airline.iataCode})` }));
}
