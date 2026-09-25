import { localDayRange } from "@/lib/time";
import type { OccupancyWindow, TimeWindow } from "@/lib/turnaround";

// Input of the automatic plan (CLAUDE.md, 4. mérföldkő, "Folyamat" 2): the
// occupancy windows of the tasks. A quick turnaround has one window, a long one
// two (they may land in different positions), a one-sided flight one; a
// cancelled part has none. A day's tasks are the windows that start on it
// (Europe/Budapest).

export type WindowPart = OccupancyWindow["part"];

export interface PlanWindow extends TimeWindow {
  /** Task and part, as on the band view. */
  id: string;
  taskId: string;
  part: WindowPart;
  /**
   * The task's flight: two tasks of one flight (different task types) never
   * share a position (5. mérföldkő). Without it the rule is not checked.
   */
  flightId?: string;
}

/** What the input needs of a task: its occupancy windows (lib/turnaround). */
export interface PlanningTask {
  id: string;
  flightId?: string;
  windows: readonly OccupancyWindow[];
}

export const windowId = (taskId: string, part: WindowPart) => `${taskId}:${part}`;

/** Start, then end, then id: the order every step of the plan works in. */
export function compareWindows(a: PlanWindow, b: PlanWindow): number {
  return a.start.getTime() - b.start.getTime() || a.end.getTime() - b.end.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

function startsIn(window: TimeWindow, day: TimeWindow): boolean {
  return window.start.getTime() >= day.start.getTime() && window.start.getTime() < day.end.getTime();
}

/** The windows that start on the Budapest day, in plan order. */
export function windowsOfDay(tasks: readonly PlanningTask[], localDate: string): PlanWindow[] {
  const day = localDayRange(localDate);
  const byId = new Map<string, PlanWindow>();
  for (const task of tasks) {
    for (const window of task.windows) {
      if (!startsIn(window, day)) continue;
      const id = windowId(task.id, window.part);
      byId.set(id, {
        id,
        taskId: task.id,
        part: window.part,
        start: window.start,
        end: window.end,
        ...(task.flightId ? { flightId: task.flightId } : {}),
      });
    }
  }
  return [...byId.values()].sort(compareWindows);
}

/**
 * Whether two sets of windows are the same: a plan day is stale when the
 * windows it was calculated from differ from today's (import, delay,
 * cancellation, or a changed template).
 */
export function sameWindows(a: readonly PlanWindow[], b: readonly PlanWindow[]): boolean {
  if (a.length !== b.length) return false;
  const key = (w: PlanWindow) => `${w.id}|${w.start.getTime()}|${w.end.getTime()}`;
  const keys = new Set(a.map(key));
  return b.every((w) => keys.has(key(w)));
}
