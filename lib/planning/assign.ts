import type { PlanWindow } from "./input";
import { compareWindows } from "./input";
import { fits } from "./position";
import type { PlanningSettings } from "./settings";

// Step 1 of the algorithm (CLAUDE.md, 4. mérföldkő, "Cél és algoritmus"): the
// fewest positions under the rules. In time order every window goes into an
// existing position where the rules still hold; a new position opens only when
// there is none. Of the positions that fit, the one whose work ends latest
// (the smallest gap) takes it, then the lower number. Without rules this is
// minimal: the number of positions is the largest number of windows at once.

/** Positions as lists of windows, numbered by their first window. Deterministic. */
export function minimalPositions(windows: readonly PlanWindow[], settings: PlanningSettings): PlanWindow[][] {
  const positions: { windows: PlanWindow[]; latestEnd: number }[] = [];
  for (const window of [...windows].sort(compareWindows)) {
    let chosen: (typeof positions)[number] | null = null;
    for (const position of positions) {
      if (chosen && position.latestEnd <= chosen.latestEnd) continue;
      if (fits([...position.windows, window], settings)) chosen = position;
    }
    if (chosen) {
      chosen.windows.push(window);
      chosen.latestEnd = Math.max(chosen.latestEnd, window.end.getTime());
    } else {
      positions.push({ windows: [window], latestEnd: window.end.getTime() });
    }
  }
  return positions.map((p) => p.windows);
}

/** The largest number of windows at the same moment (half-open intervals). */
export function maxConcurrent(windows: readonly PlanWindow[]): number {
  // An end sorts before a start at the same instant: touching windows do not overlap.
  const events = windows.flatMap((w) => [
    { at: w.start.getTime(), delta: 1 },
    { at: w.end.getTime(), delta: -1 },
  ]);
  events.sort((a, b) => a.at - b.at || a.delta - b.delta);
  let current = 0;
  let max = 0;
  for (const event of events) {
    current += event.delta;
    max = Math.max(max, current);
  }
  return max;
}
