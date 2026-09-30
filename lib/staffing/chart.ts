import { localParts } from "@/lib/time";
import type { TimeWindow } from "@/lib/turnaround";

// The geometry of the step chart of the daily view (CLAUDE.md, 9. mérföldkő,
// "Nézet"): the value of a band is constant through it, so every series is a
// line of steps. Pure functions; the component only draws them.

/**
 * An SVG path of steps: value i runs from x(i) to x(i + 1). With a baseline
 * the path is closed down to it, for a filled area.
 */
export function stepPath(
  values: readonly number[],
  x: (index: number) => number,
  y: (value: number) => number,
  baseline?: number,
): string {
  if (values.length === 0) return "";
  const parts = [`M${x(0)} ${y(values[0])}`];
  values.forEach((value, index) => {
    if (index > 0 && value !== values[index - 1]) parts.push(`V${y(value)}`);
    parts.push(`H${x(index + 1)}`);
  });
  if (baseline !== undefined) parts.push(`V${y(baseline)}`, `H${x(0)}`, "Z");
  return parts.join(" ");
}

/**
 * The steps of a series only where it is above zero, each run standing on the
 * baseline: a task type with no work in a band draws nothing there.
 */
export function raisedStepPath(values: readonly number[], x: (index: number) => number, y: (value: number) => number): string {
  return runsOf(values.length, (index) => values[index] > 0)
    .map(([from, to]) => {
      const parts = [`M${x(from)} ${y(0)}`];
      for (let index = from; index < to; index++) {
        if (index === from || values[index] !== values[index - 1]) parts.push(`V${y(values[index])}`);
        parts.push(`H${x(index + 1)}`);
      }
      parts.push(`V${y(0)}`);
      return parts.join(" ");
    })
    .join(" ");
}

/** The bands that start on a full hour, with the hour as the label ("08"). */
export function hourMarks(bands: readonly TimeWindow[]): { index: number; label: string }[] {
  return bands.flatMap((band, index) => {
    const { hour, minute } = localParts(band.start);
    return minute === 0 ? [{ index, label: String(hour).padStart(2, "0") }] : [];
  });
}

/** Whole-number ticks from zero to the top of the chart, at most about six of them. */
export function countTicks(max: number): number[] {
  const top = Math.max(1, Math.ceil(max));
  const step = Math.ceil(top / 6);
  const ticks: number[] = [];
  for (let value = 0; value <= top; value += step) ticks.push(value);
  if (ticks.at(-1) !== top) ticks.push(ticks.at(-1)! + step);
  return ticks;
}

/** Runs of neighbouring indexes that satisfy the test, as [from, to) pairs. */
export function runsOf(length: number, test: (index: number) => boolean): [number, number][] {
  const runs: [number, number][] = [];
  for (let index = 0; index < length; index++) {
    if (!test(index)) continue;
    const last = runs.at(-1);
    if (last && last[1] === index) last[1] = index + 1;
    else runs.push([index, index + 1]);
  }
  return runs;
}
