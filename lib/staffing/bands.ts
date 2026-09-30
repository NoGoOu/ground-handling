import { localDayRange } from "@/lib/time";
import type { TimeWindow } from "@/lib/turnaround";

// The bands of the staffing demand (CLAUDE.md, 9. mérföldkő, "Számítás"):
// 15 minutes each, on the calendar day (00:00–24:00, Europe/Budapest), counted
// from the start of the day. On the day the clocks change the bands follow
// real time, so there are 92 or 100 of them instead of 96.

export const BAND_MINUTES = 15;
const BAND_MS = BAND_MINUTES * 60_000;

/** The bands of a Budapest day, in time order; like every window in the app they are half-open. */
export function dayBands(localDate: string): TimeWindow[] {
  const { start, end } = localDayRange(localDate);
  const bands: TimeWindow[] = [];
  for (let time = start.getTime(); time < end.getTime(); time += BAND_MS) {
    bands.push({ start: new Date(time), end: new Date(time + BAND_MS) });
  }
  return bands;
}

/** How many of the half-open windows run at the instant. */
export function countAt(windows: readonly TimeWindow[], instant: number): number {
  let count = 0;
  for (const window of windows) {
    if (window.start.getTime() <= instant && instant < window.end.getTime()) count++;
  }
  return count;
}

/**
 * The instants within a band where the count of running windows may change:
 * the start of the band and every window edge strictly inside it. Between two
 * of them the count is constant, so they are all a peak or a low needs.
 */
export function changePoints(band: TimeWindow, windows: readonly TimeWindow[]): number[] {
  const [from, to] = [band.start.getTime(), band.end.getTime()];
  const points = new Set<number>([from]);
  for (const window of windows) {
    for (const edge of [window.start.getTime(), window.end.getTime()]) {
      if (edge > from && edge < to) points.add(edge);
    }
  }
  return [...points];
}
