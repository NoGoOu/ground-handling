import type { PlanWindow } from "./input";
import { compareWindows } from "./input";
import { fits } from "./position";
import type { PlanningSettings } from "./settings";
import { deficiency, type Staffing } from "./staffing";

// Step 1 of the algorithm (CLAUDE.md, 4. mérföldkő, "Cél és algoritmus"): the
// fewest positions under the rules. In time order every window goes into an
// existing position where the rules still hold; a new position opens only when
// there is none. Of the positions that fit, the one whose work ends latest
// (the smallest gap) takes it, then the lower number. Without rules this is
// minimal: the number of positions is the largest number of windows at once.
//
// With the qualifications (6. mérföldkő) the step also aims at a day that can
// be staffed: a window goes, if it can, into a position whose requirement
// already covers the window's; else into one it may widen, or a new position,
// as long as the positions left empty at best (the deficiency) do not grow;
// only then as without qualifications. Without requirements nothing changes.

interface OpenPosition {
  windows: PlanWindow[];
  latestEnd: number;
  requires: string[];
}

/** Of the positions, the one whose work ends latest; the lower number on a tie. */
function latestEnding(positions: readonly OpenPosition[]): OpenPosition | null {
  let chosen: OpenPosition | null = null;
  for (const position of positions) if (!chosen || position.latestEnd > chosen.latestEnd) chosen = position;
  return chosen;
}

const union = (a: readonly string[], b: readonly string[]) => [...new Set([...a, ...b])].sort();

/** Positions as lists of windows, numbered by their first window. Deterministic. */
export function minimalPositions(
  windows: readonly PlanWindow[],
  settings: PlanningSettings,
  staffing?: Staffing,
): PlanWindow[][] {
  const positions: OpenPosition[] = [];
  for (const window of [...windows].sort(compareWindows)) {
    const fitting = positions.filter((position) => fits([...position.windows, window], settings));
    let chosen: OpenPosition | null;
    if (!staffing) {
      chosen = latestEnding(fitting);
    } else {
      const needs = window.requires ?? [];
      const covering = fitting.filter((position) => needs.every((id) => position.requires.includes(id)));
      if (covering.length > 0) {
        chosen = latestEnding(covering);
      } else {
        const requirements = positions.map((position) => position.requires);
        const before = deficiency(requirements, staffing);
        const widening = fitting.filter(
          (position) =>
            deficiency(
              positions.map((p) => (p === position ? union(p.requires, needs) : p.requires)),
              staffing,
            ) <= before,
        );
        if (widening.length > 0) chosen = latestEnding(widening);
        else if (deficiency([...requirements, needs], staffing) <= before) chosen = null;
        else chosen = latestEnding(fitting);
      }
    }
    if (chosen) {
      chosen.windows.push(window);
      chosen.latestEnd = Math.max(chosen.latestEnd, window.end.getTime());
      chosen.requires = union(chosen.requires, window.requires ?? []);
    } else {
      positions.push({ windows: [window], latestEnd: window.end.getTime(), requires: [...(window.requires ?? [])] });
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
