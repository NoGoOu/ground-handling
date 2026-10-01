import type { StaffSegment } from "@/lib/staffing/roster";
import { toLocalDate } from "@/lib/time";

// Which roster the staffing demand is set against (CLAUDE.md, 9. mérföldkő,
// utómunka): on a published day the actual layer, on a day not yet published
// the draft, for whoever may see the draft. The others see only the demand
// there, as before.

export type RosterSource = "ACTUAL" | "DRAFT";

/** The layer a day's roster comes from; null when the viewer may see none of that day. */
export function dayRosterLayer(published: boolean, canSeeDraft: boolean): RosterSource | null {
  if (published) return "ACTUAL";
  return canSeeDraft ? "DRAFT" : null;
}

/** A shift of the actual or the draft layer with its segments. */
export interface StaffShift {
  userId: string;
  layer: RosterSource;
  /** The start of its first segment: a shift belongs to the day it starts on. */
  start: Date | null;
  segments: Omit<StaffSegment, "userId" | "layer">[];
}

/**
 * The segments that count: each shift by the layer of the day it starts on,
 * so that a shift over midnight counts on the next day too, whether that day
 * is published or not. An actual shift on a day not yet published and a draft
 * shift on a published day do not count.
 */
export function rosterSegments(
  shifts: readonly StaffShift[],
  isPublishedDay: (day: string) => boolean,
  canSeeDraft: boolean,
): StaffSegment[] {
  return shifts
    .filter((shift) => shift.start && dayRosterLayer(isPublishedDay(toLocalDate(shift.start)), canSeeDraft) === shift.layer)
    .flatMap((shift) => shift.segments.map((segment) => ({ ...segment, userId: shift.userId, layer: shift.layer })));
}
