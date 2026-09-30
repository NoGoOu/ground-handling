import { changePoints, countAt } from "@/lib/staffing/bands";
import { windowsOverlap, type TimeWindow } from "@/lib/turnaround";

// The staffing demand (CLAUDE.md, 9. mérföldkő, "Számítás"): how many agents
// are needed at once, per 15-minute band, from the occupancy windows of every
// task. It does not depend on the assignment.

/** An occupancy window with the task type of its task. */
export interface DemandWindow extends TimeWindow {
  taskType: string;
}

/** What the demand needs of a task: its task type and its occupancy windows (lib/turnaround). */
export interface DemandTask {
  taskType: string;
  /** None for a cancelled part and for a task with nothing to do. */
  windows: readonly TimeWindow[];
}

/** Every window of every task: a long turnaround gives two, a cancelled part none. */
export function demandWindows(tasks: readonly DemandTask[]): DemandWindow[] {
  return tasks.flatMap((task) => task.windows.map(({ start, end }) => ({ start, end, taskType: task.taskType })));
}

/**
 * The demand of a band: the most windows running at once within it. The
 * windows are half-open, so one that ends at the start of the band and one
 * that starts at its end do not count.
 */
export function peakWithin(band: TimeWindow, windows: readonly TimeWindow[]): number {
  const touching = windows.filter((window) => windowsOverlap(window, band));
  if (touching.length === 0) return 0;
  return Math.max(...changePoints(band, touching).map((instant) => countAt(touching, instant)));
}

export interface BandDemand extends TimeWindow {
  /** The peak of all the windows together: not the sum of the task types' peaks. */
  total: number;
  /** The peak per task type, for every task type asked for. */
  byType: Record<string, number>;
}

/** The demand of each band, per task type and in total. */
export function demandOfBands(
  bands: readonly TimeWindow[],
  windows: readonly DemandWindow[],
  taskTypes: readonly string[],
): BandDemand[] {
  const ofType = new Map(taskTypes.map((type) => [type, windows.filter((window) => window.taskType === type)]));
  return bands.map((band) => ({
    start: band.start,
    end: band.end,
    total: peakWithin(band, windows),
    byType: Object.fromEntries(taskTypes.map((type) => [type, peakWithin(band, ofType.get(type)!)])),
  }));
}

/** The task types that have a window touching any of the bands, in order. */
export function taskTypesOf(bands: readonly TimeWindow[], windows: readonly DemandWindow[]): string[] {
  if (bands.length === 0) return [];
  const span = { start: bands[0].start, end: bands[bands.length - 1].end };
  return [...new Set(windows.filter((window) => windowsOverlap(window, span)).map((window) => window.taskType))].sort();
}
