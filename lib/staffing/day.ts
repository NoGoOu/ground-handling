import { blockWindow, castsBlock } from "@/lib/board";
import { dayBands } from "@/lib/staffing/bands";
import { demandOfBands, taskTypesOf, type DemandWindow } from "@/lib/staffing/demand";
import { staffingOfBands, type StaffingBand, type StaffSegment } from "@/lib/staffing/roster";
import { localDayRange } from "@/lib/time";
import { windowsOverlap } from "@/lib/turnaround";

// One Budapest day of the staffing demand (CLAUDE.md, 9. mérföldkő): its bands
// with the demand per task type and in total, against the actual roster.

export interface StaffingDay {
  day: string;
  /** The task types with work on the day, in order. */
  taskTypes: string[];
  bands: StaffingBand[];
  /**
   * Whether the actual roster has anything on the day. Without it (e.g. a day
   * not yet published) the demand shows, but is not marked as a shortage.
   */
  hasRoster: boolean;
}

/**
 * The windows and the segments may reach beyond the day: a window over
 * midnight counts on both days, and so does a shift over midnight.
 */
export function staffingDay(day: string, windows: readonly DemandWindow[], segments: readonly StaffSegment[]): StaffingDay {
  const range = localDayRange(day);
  const bands = dayBands(day);
  const ownWindows = windows.filter((window) => windowsOverlap(window, range));
  // A block's travel time may reach into the day though its segment does not.
  const ownSegments = segments.filter((segment) => windowsOverlap(castsBlock(segment) ? blockWindow(segment) : segment, range));
  const taskTypes = taskTypesOf(bands, ownWindows);
  return {
    day,
    taskTypes,
    bands: staffingOfBands(demandOfBands(bands, ownWindows, taskTypes), ownSegments),
    hasRoster: segments.some((segment) => windowsOverlap(segment, range)),
  };
}
