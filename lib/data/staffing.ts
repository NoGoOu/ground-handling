import { daysOf, listPlanningTasks } from "@/lib/data/planning";
import { isPublished, listPublicationsInRange } from "@/lib/data/publications";
import { listShiftsOverlapping, type RosterShift } from "@/lib/data/shifts";
import { staffingDay, type StaffingDay } from "@/lib/staffing/day";
import { demandWindows } from "@/lib/staffing/demand";
import { dayRosterLayer, rosterSegments, type RosterSource, type StaffShift } from "@/lib/staffing/layers";
import { addDays, localDayRange, toLocalDate } from "@/lib/time";

// Data side of the staffing demand (CLAUDE.md, 9. mérföldkő). The
// calculations are pure (lib/staffing); this file only loads: the occupancy
// windows of every task that touch the days, and the roster: the actual
// layer, and for whoever may see it the draft of the days not yet published.

/** A block's travel time may reach into the period from a segment outside it; it is capped far below this. */
const BLOCK_MARGIN_MS = 12 * 60 * 60_000;

export interface Staffing {
  days: StaffingDay[];
  /** The names of the task types, by code. */
  taskTypeNames: Map<string, string>;
}

function toStaffShift(shift: RosterShift): StaffShift {
  return {
    userId: shift.user.id,
    layer: shift.layer as RosterSource,
    start: shift.start,
    segments: shift.segments.map((segment) => ({
      start: segment.start,
      end: segment.end,
      operative: segment.type.operative,
      createBlock: segment.createBlock,
      travelBeforeMinutes: segment.travelBeforeMinutes,
      travelAfterMinutes: segment.travelAfterMinutes,
    })),
  };
}

/**
 * The staffing of every day of the period. Unlike the planner, which takes
 * the windows that start on a day, a day here has every window that overlaps
 * it; a window reaches at most into the next day from the day its flight
 * shows on, so the lists of the period and the day before and after hold them.
 * `draft` tells whether the viewer may see the draft layer: only then do the
 * days not yet published get a roster (9. mérföldkő, utómunka).
 */
export async function loadStaffing(start: string, end: string, { draft }: { draft: boolean }): Promise<Staffing> {
  const period = { start: localDayRange(start).start, end: localDayRange(end).end };
  const reach = { start: new Date(period.start.getTime() - BLOCK_MARGIN_MS), end: new Date(period.end.getTime() + BLOCK_MARGIN_MS) };
  // The draft is not even loaded for whoever may not see it.
  const layers: RosterSource[] = draft ? ["ACTUAL", "DRAFT"] : ["ACTUAL"];
  const [tasks, ...shiftsByLayer] = await Promise.all([
    listPlanningTasks(addDays(start, -1), end),
    ...layers.map((layer) => listShiftsOverlapping(reach, layer)),
  ]);
  const shifts = shiftsByLayer.flat();

  // A shift counts by the layer of the day it starts on, which may be before the period.
  const firstDay = shifts.reduce((first, shift) => {
    const day = shift.start ? toLocalDate(shift.start) : first;
    return day < first ? day : first;
  }, addDays(start, -1));
  const publications = await listPublicationsInRange(firstDay, end);
  const isPublishedDay = (day: string) => isPublished(day, publications);

  // Every task of every task type, whatever its status and assignment; a
  // cancelled part and a task with nothing to do have no window.
  const windows = demandWindows(tasks.map((task) => ({ taskType: task.taskType.code, windows: task.timeline.shape.windows })));
  const segments = rosterSegments(shifts.map(toStaffShift), isPublishedDay, draft);

  return {
    days: daysOf(start, end).map((day) => staffingDay(day, windows, segments, dayRosterLayer(isPublishedDay(day), draft))),
    taskTypeNames: new Map(tasks.map((task) => [task.taskType.code, task.taskType.name])),
  };
}
