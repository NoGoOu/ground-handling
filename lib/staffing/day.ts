import { blockWindow, castsBlock } from "@/lib/board";
import { dayBands } from "@/lib/staffing/bands";
import { demandOfBands, taskTypesOf, type DemandWindow } from "@/lib/staffing/demand";
import type { RosterSource } from "@/lib/staffing/layers";
import { staffingOfBands, type StaffingBand, type StaffSegment } from "@/lib/staffing/roster";
import { localDayRange } from "@/lib/time";
import { windowsOverlap } from "@/lib/turnaround";

// One Budapest day of the staffing demand (CLAUDE.md, 9. mérföldkő): its bands
// with the demand per task type and in total, against the roster: the actual
// layer, or on a day not yet published the draft.

export interface StaffingDay {
  day: string;
  /** The task types with work on the day, in order. */
  taskTypes: string[];
  bands: StaffingBand[];
  /**
   * The layer the day's roster comes from: the actual one on a published day,
   * the draft on a day not yet published (9. mérföldkő, utómunka); null when
   * the viewer may not see the draft, and the day shows only its demand.
   */
  rosterLayer: RosterSource | null;
  /**
   * Whether that layer has anything on the day. Without it the demand shows,
   * but is not marked as a shortage.
   */
  hasRoster: boolean;
}

/**
 * The windows and the segments may reach beyond the day: a window over
 * midnight counts on both days, and so does a shift over midnight. The
 * segments are those that count (lib/staffing/layers), whatever their layer;
 * the day has a roster only when its own layer has something on it, so a
 * shift over midnight from the day before alone does not make a shortage.
 */
export function staffingDay(
  day: string,
  windows: readonly DemandWindow[],
  segments: readonly StaffSegment[],
  rosterLayer: RosterSource | null = "ACTUAL",
): StaffingDay {
  const range = localDayRange(day);
  const bands = dayBands(day);
  const ownWindows = windows.filter((window) => windowsOverlap(window, range));
  // A block's travel time may reach into the day though its segment does not.
  const ownSegments = rosterLayer
    ? segments.filter((segment) => windowsOverlap(castsBlock(segment) ? blockWindow(segment) : segment, range))
    : [];
  const taskTypes = taskTypesOf(bands, ownWindows);
  return {
    day,
    taskTypes,
    bands: staffingOfBands(demandOfBands(bands, ownWindows, taskTypes), ownSegments),
    rosterLayer,
    hasRoster: ownSegments.some((segment) => (segment.layer ?? "ACTUAL") === rosterLayer && windowsOverlap(segment, range)),
  };
}
