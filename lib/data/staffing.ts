import { daysOf, listPlanningTasks } from "@/lib/data/planning";
import { listShiftsOverlapping } from "@/lib/data/shifts";
import { staffingDay, type StaffingDay } from "@/lib/staffing/day";
import { demandWindows } from "@/lib/staffing/demand";
import type { StaffSegment } from "@/lib/staffing/roster";
import { addDays, localDayRange } from "@/lib/time";

// Data side of the staffing demand (CLAUDE.md, 9. mérföldkő). The
// calculations are pure (lib/staffing); this file only loads: the occupancy
// windows of every task that touch the days, and the actual roster.

/** A block's travel time may reach into the period from a segment outside it; it is capped far below this. */
const BLOCK_MARGIN_MS = 12 * 60 * 60_000;

export interface Staffing {
  days: StaffingDay[];
  /** The names of the task types, by code. */
  taskTypeNames: Map<string, string>;
}

/**
 * The staffing of every day of the period. Unlike the planner, which takes
 * the windows that start on a day, a day here has every window that overlaps
 * it; a window reaches at most into the next day from the day its flight
 * shows on, so the lists of the period and the day before and after hold them.
 */
export async function loadStaffing(start: string, end: string): Promise<Staffing> {
  const period = { start: localDayRange(start).start, end: localDayRange(end).end };
  const [tasks, shifts] = await Promise.all([
    listPlanningTasks(addDays(start, -1), end),
    listShiftsOverlapping(
      { start: new Date(period.start.getTime() - BLOCK_MARGIN_MS), end: new Date(period.end.getTime() + BLOCK_MARGIN_MS) },
      "ACTUAL",
    ),
  ]);

  // Every task of every task type, whatever its status and assignment; a
  // cancelled part and a task with nothing to do have no window.
  const windows = demandWindows(tasks.map((task) => ({ taskType: task.taskType.code, windows: task.timeline.shape.windows })));
  const segments: StaffSegment[] = shifts.flatMap((shift) =>
    shift.segments.map((segment) => ({
      userId: shift.user.id,
      start: segment.start,
      end: segment.end,
      operative: segment.type.operative,
      createBlock: segment.createBlock,
      travelBeforeMinutes: segment.travelBeforeMinutes,
      travelAfterMinutes: segment.travelAfterMinutes,
    })),
  );

  return {
    days: daysOf(start, end).map((day) => staffingDay(day, windows, segments)),
    taskTypeNames: new Map(tasks.map((task) => [task.taskType.code, task.taskType.name])),
  };
}
