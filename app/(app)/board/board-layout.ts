import type { TimeWindow } from "@/lib/turnaround";

/** Geometry of the band view: time → horizontal position. */
export interface Range {
  startMs: number;
  endMs: number;
}

export const LANE_LABEL_WIDTH = "w-44 shrink-0";

export function percent(range: Range, time: Date): number {
  return ((time.getTime() - range.startMs) / (range.endMs - range.startMs)) * 100;
}

/** Left and width in percent, clamped to the visible range. */
export function windowStyle(range: Range, window: TimeWindow) {
  const left = Math.max(0, percent(range, window.start));
  const right = Math.min(100, percent(range, window.end));
  return { left: `${left}%`, width: `${Math.max(0, right - left)}%` };
}
