import type { TimeWindow } from "@/lib/turnaround";
import { compareWindows, type PlanWindow } from "./input";
import type { PlanningSettings } from "./settings";

// One position of the plan (CLAUDE.md, 4. mérföldkő, "Pozíció és műszak"): a
// series of windows that makes one future shift. Pure functions; the windows
// are half-open intervals.
//
// - The shift runs from the first window's start to the last window's end,
//   pushed out to the minimum shift length; it may not exceed the maximum.
// - Between two windows in a row the gap is at least the rest; with overlap
//   allowed it may be negative by at most that much. The gap is measured
//   from the latest end so far, so a long window counts for every later one.
// - A shift longer than the break threshold needs a task-free gap of at least
//   the break length; that gap is marked as the break. Free time at the end of
//   a shift pushed out to its minimum length counts as such a gap.

const MINUTE_MS = 60_000;

export type Violation = "REST" | "OVERLAP" | "MAX_SHIFT" | "BREAK";

const minutes = (ms: number) => ms / MINUTE_MS;

export function sortWindows(windows: readonly PlanWindow[]): PlanWindow[] {
  return [...windows].sort(compareWindows);
}

/** The windows merged into continuous busy stretches. */
export function busyStretches(windows: readonly PlanWindow[]): TimeWindow[] {
  const stretches: TimeWindow[] = [];
  for (const window of sortWindows(windows)) {
    const last = stretches.at(-1);
    if (last && window.start.getTime() <= last.end.getTime()) {
      if (window.end.getTime() > last.end.getTime()) last.end = window.end;
    } else {
      stretches.push({ start: window.start, end: window.end });
    }
  }
  return stretches;
}

/** Minutes with at least one window: overlapping windows count once. */
export function busyMinutes(windows: readonly PlanWindow[]): number {
  return busyStretches(windows).reduce((sum, s) => sum + minutes(s.end.getTime() - s.start.getTime()), 0);
}

/** First window's start → last end, pushed out to the minimum length. Null when empty. */
export function shiftOf(windows: readonly PlanWindow[], settings: PlanningSettings): TimeWindow | null {
  if (windows.length === 0) return null;
  const start = Math.min(...windows.map((w) => w.start.getTime()));
  const end = Math.max(...windows.map((w) => w.end.getTime()), start + settings.minShiftMinutes * MINUTE_MS);
  return { start: new Date(start), end: new Date(end) };
}

/** Task-free stretches inside the shift, the pushed-out end included. */
export function freeGaps(windows: readonly PlanWindow[], settings: PlanningSettings): TimeWindow[] {
  const shift = shiftOf(windows, settings);
  if (!shift) return [];
  const stretches = busyStretches(windows);
  const gaps: TimeWindow[] = [];
  stretches.forEach((stretch, index) => {
    const nextStart = index + 1 < stretches.length ? stretches[index + 1].start : shift.end;
    if (nextStart.getTime() > stretch.end.getTime()) gaps.push({ start: stretch.end, end: nextStart });
  });
  return gaps;
}

export function shiftMinutes(windows: readonly PlanWindow[], settings: PlanningSettings): number {
  const shift = shiftOf(windows, settings);
  return shift ? minutes(shift.end.getTime() - shift.start.getTime()) : 0;
}

export function needsBreak(windows: readonly PlanWindow[], settings: PlanningSettings): boolean {
  return settings.breakMinutes > 0 && shiftMinutes(windows, settings) > settings.breakAfterMinutes;
}

/**
 * The break the plan marks: of the gaps long enough, the one nearest the
 * middle of the shift (the earlier one on a tie). Null when no break is
 * needed or none fits.
 */
export function breakOf(windows: readonly PlanWindow[], settings: PlanningSettings): TimeWindow | null {
  if (!needsBreak(windows, settings)) return null;
  const shift = shiftOf(windows, settings)!;
  const middle = (shift.start.getTime() + shift.end.getTime()) / 2;
  const long = freeGaps(windows, settings).filter((g) => minutes(g.end.getTime() - g.start.getTime()) >= settings.breakMinutes);
  let best: TimeWindow | null = null;
  let bestDistance = Infinity;
  for (const gap of long) {
    const distance = Math.abs((gap.start.getTime() + gap.end.getTime()) / 2 - middle);
    if (distance < bestDistance) {
      best = gap;
      bestDistance = distance;
    }
  }
  return best;
}

/** The rules the position breaks, each once, in a fixed order. */
export function violations(windows: readonly PlanWindow[], settings: PlanningSettings): Violation[] {
  const found = new Set<Violation>();
  let latestEnd: number | null = null;
  for (const window of sortWindows(windows)) {
    if (latestEnd !== null) {
      const gap = minutes(window.start.getTime() - latestEnd);
      if (gap < -settings.overlapMinutes) found.add("OVERLAP");
      // An allowed overlap is not a missing rest: only one of the two is above zero.
      else if (gap >= 0 && gap < settings.restMinutes) found.add("REST");
    }
    latestEnd = Math.max(latestEnd ?? -Infinity, window.end.getTime());
  }
  if (shiftMinutes(windows, settings) > settings.maxShiftMinutes) found.add("MAX_SHIFT");
  if (needsBreak(windows, settings) && !breakOf(windows, settings)) found.add("BREAK");
  return (["REST", "OVERLAP", "MAX_SHIFT", "BREAK"] as const).filter((v) => found.has(v));
}

export function fits(windows: readonly PlanWindow[], settings: PlanningSettings): boolean {
  return violations(windows, settings).length === 0;
}
