import { isPublished, type PublishedRange } from "@/lib/roster";
import { findOverlap } from "@/lib/validation/shift";
import type { PlanWindow } from "./input";
import { shiftOf } from "./position";
import type { PlanningSettings } from "./settings";

// "Mentés a tervezetbe" (CLAUDE.md, 4. mérföldkő, "Nevek és tervezet"): a draft
// shift for every named position, one operative segment from the start of its
// first window to the end of its shift. Published days are locked and skipped.
// Nothing is saved while any shift would overlap another draft shift of the
// same agent (2. mérföldkő). Pure; the data layer loads and writes.

export interface DraftPosition {
  dayId: string;
  day: string;
  number: number;
  userId: string | null;
  userName: string | null;
  windows: readonly PlanWindow[];
  /** The settings copy of the plan day. */
  settings: PlanningSettings;
}

export interface DraftShift {
  dayId: string;
  day: string;
  number: number;
  userId: string;
  userName: string;
  start: Date;
  end: Date;
}

export interface DraftPlan {
  shifts: DraftShift[];
  /** Days of the plan with positions that the publication locks. */
  publishedDays: string[];
  /** Days the save writes (it replaces their earlier draft shifts). */
  savedDays: string[];
  /** Positions without a name: no shift for them. */
  unnamed: { day: string; number: number }[];
}

export function draftPlan(
  positions: readonly DraftPosition[],
  days: readonly string[],
  publications: readonly PublishedRange[],
): DraftPlan {
  const published = new Set(days.filter((day) => isPublished(day, publications)));
  const shifts: DraftShift[] = [];
  const unnamed: DraftPlan["unnamed"] = [];
  for (const position of positions) {
    if (published.has(position.day) || position.windows.length === 0) continue;
    if (!position.userId || !position.userName) {
      unnamed.push({ day: position.day, number: position.number });
      continue;
    }
    const shift = shiftOf(position.windows, position.settings)!;
    shifts.push({
      dayId: position.dayId,
      day: position.day,
      number: position.number,
      userId: position.userId,
      userName: position.userName,
      start: shift.start,
      end: shift.end,
    });
  }
  const order = (a: { day: string; number: number }, b: { day: string; number: number }) =>
    a.day < b.day ? -1 : a.day > b.day ? 1 : a.number - b.number;
  return {
    shifts: shifts.sort(order),
    publishedDays: [...published].filter((day) => positions.some((p) => p.day === day && p.windows.length > 0)).sort(),
    savedDays: days.filter((day) => !published.has(day)),
    unnamed: unnamed.sort(order),
  };
}

export interface AgentShiftSpan {
  userId: string;
  start: Date;
  end: Date;
}

export interface DraftConflict {
  day: string;
  number: number;
  userName: string;
  /** The shift it runs into. */
  clash: { start: Date; end: Date };
}

/**
 * The new shifts that overlap a draft shift the agent already has, or another
 * new shift of the same agent (half-open intervals: touching is fine).
 */
export function draftConflicts(shifts: readonly DraftShift[], existing: readonly AgentShiftSpan[]): DraftConflict[] {
  const conflicts: DraftConflict[] = [];
  shifts.forEach((shift, index) => {
    const others = [
      ...existing.filter((span) => span.userId === shift.userId),
      ...shifts.slice(0, index).filter((other) => other.userId === shift.userId),
    ];
    const clash = findOverlap(shift, others);
    if (clash) {
      conflicts.push({ day: shift.day, number: shift.number, userName: shift.userName, clash: { start: clash.start, end: clash.end } });
    }
  });
  return conflicts;
}
