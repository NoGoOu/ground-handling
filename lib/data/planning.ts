import { listTaskViewsForDay, type TaskView } from "@/lib/data/tasks";
import { prisma } from "@/lib/db";
import { windowsOfDay, type PlanWindow } from "@/lib/planning/input";
import { DEFAULT_PLANNING_SETTINGS, pickSettings, type PlanningSettings } from "@/lib/planning/settings";
import { SETTINGS_ID } from "@/lib/settings";
import { addDays } from "@/lib/time";

// Data side of the planner view (4. mérföldkő). The calculations are pure
// (lib/planning); this file only loads and saves.

/** Every Budapest day from start to end, both included. */
export function daysOf(start: string, end: string): string[] {
  const days: string[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day);
  return days;
}

/**
 * The tasks whose windows may start in the period. A window starts before its
 * anchor, so a task shows on the list of the window's day or the day after;
 * the lists of the period and the following day hold every one of them.
 */
export async function listPlanningTasks(start: string, end: string): Promise<TaskView[]> {
  const byId = new Map<string, TaskView>();
  for (const day of daysOf(start, addDays(end, 1))) {
    for (const task of await listTaskViewsForDay(day)) byId.set(task.id, task);
  }
  return [...byId.values()];
}

/** The input of each day of the period (CLAUDE.md, "Folyamat" 2). */
export function windowsByDay(tasks: readonly TaskView[], days: readonly string[]): Map<string, PlanWindow[]> {
  const planning = tasks.map((task) => ({ id: task.id, windows: task.timeline.shape.windows }));
  return new Map(days.map((day) => [day, windowsOfDay(planning, day)]));
}

/** The global planning settings, and the segment type the draft shifts get. */
export async function getPlanningSettings(): Promise<{ settings: PlanningSettings; segmentTypeId: string | null }> {
  const row = await prisma.planningSetting.findUnique({ where: { id: SETTINGS_ID } });
  return row
    ? { settings: pickSettings(row), segmentTypeId: row.segmentTypeId }
    : { settings: DEFAULT_PLANNING_SETTINGS, segmentTypeId: null };
}

/** Segment types a saved shift may get: active and operative. */
export async function listShiftSegmentTypes() {
  return prisma.segmentType.findMany({
    where: { active: true, operative: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
