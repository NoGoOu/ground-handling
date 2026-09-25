import { minimalPositions } from "./assign";
import { compareWindows, type PlanWindow } from "./input";
import { busyMinutes, fits, shiftMinutes } from "./position";
import type { PlanningSettings } from "./settings";
import { deficiency, positionRequirement, type Staffing } from "./staffing";

// Steps 2–3 of the algorithm (CLAUDE.md, 4. mérföldkő, "Cél és algoritmus"):
// an even load within the allowed headcount (the minimum + the allowed extra
// positions), then the fewer working hours, then the less idle time. A local
// search from the result of step 1: it moves one window to another position
// or swaps two, as long as that makes the plan better and every rule still
// holds. Every step makes the score strictly smaller, so it ends; the order of
// trying is fixed, so the same input always gives the same plan.

/** Busy minutes, shift minutes and idle minutes of one position. */
export interface PositionStats {
  busyMinutes: number;
  shiftMinutes: number;
  idleMinutes: number;
}

export interface PlanMetrics {
  positions: number;
  perPosition: PositionStats[];
  /** Sum of the shift lengths. */
  workMinutes: number;
  idleMinutes: number;
  loadMin: number;
  loadMax: number;
  /** loadMax − loadMin: what the balancing makes small. */
  loadSpread: number;
}

export function positionStats(windows: readonly PlanWindow[], settings: PlanningSettings): PositionStats {
  const busy = busyMinutes(windows);
  const shift = shiftMinutes(windows, settings);
  return { busyMinutes: busy, shiftMinutes: shift, idleMinutes: shift - busy };
}

/** The indicators of a plan day (CLAUDE.md, "Mutatók"); empty positions are left out. */
export function metricsOf(positions: readonly (readonly PlanWindow[])[], settings: PlanningSettings): PlanMetrics {
  const perPosition = positions.filter((p) => p.length > 0).map((p) => positionStats(p, settings));
  const loads = perPosition.map((s) => s.busyMinutes);
  const loadMin = loads.length ? Math.min(...loads) : 0;
  const loadMax = loads.length ? Math.max(...loads) : 0;
  return {
    positions: perPosition.length,
    perPosition,
    workMinutes: perPosition.reduce((sum, s) => sum + s.shiftMinutes, 0),
    idleMinutes: perPosition.reduce((sum, s) => sum + s.idleMinutes, 0),
    loadMin,
    loadMax,
    loadSpread: loadMax - loadMin,
  };
}

/** What the search makes smaller, in order: spread, work, idle, then the squares of the loads. */
type Score = [spread: number, work: number, idle: number, squares: number];

function scoreOf(stats: readonly PositionStats[]): Score {
  let min = Infinity;
  let max = -Infinity;
  let work = 0;
  let idle = 0;
  let squares = 0;
  for (const s of stats) {
    min = Math.min(min, s.busyMinutes);
    max = Math.max(max, s.busyMinutes);
    work += s.shiftMinutes;
    idle += s.idleMinutes;
    squares += s.busyMinutes * s.busyMinutes;
  }
  return [stats.length ? max - min : 0, work, idle, squares];
}

export function compareScores(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

const EMPTY: PositionStats = { busyMinutes: 0, shiftMinutes: 0, idleMinutes: 0 };
const MAX_STEPS = 2000;
const MINUTE_MS = 60_000;

/** A change the search may make: move window `x` from `from` to `to`, or swap it with `y`. */
interface Candidate {
  score: Score;
  from: number;
  to: number;
  x: number;
  y: number | null;
}

/**
 * The local search over a fixed number of positions. An empty position counts
 * with a load of zero, so the search fills the extra positions it was given.
 * Windows are handled by their index in plan order, so a position is a sorted
 * list of numbers, and a candidate's stats come from one pass without copying.
 */
function improve(start: PlanWindow[][], settings: PlanningSettings, staffing?: Staffing): PlanWindow[][] {
  const all = start.flat().sort(compareWindows);
  const index = new Map(all.map((window, i) => [window, i]));
  const starts = all.map((w) => w.start.getTime());
  const ends = all.map((w) => w.end.getTime());
  const minShiftMs = settings.minShiftMinutes * MINUTE_MS;
  const positions = start.map((p) => p.map((w) => index.get(w)!).sort((a, b) => a - b));

  /** Stats of a position without `remove` and with `add`, in one ordered pass. */
  function statsWith(position: readonly number[], remove: number | null, add: number | null): PositionStats {
    let first = -1;
    let maxEnd = -Infinity;
    let busy = 0;
    let runStart = 0;
    let runEnd = -Infinity;
    const visit = (i: number) => {
      const s = starts[i];
      const e = ends[i];
      if (first < 0) {
        first = s;
        runStart = s;
        runEnd = e;
      } else if (s <= runEnd) {
        if (e > runEnd) runEnd = e;
      } else {
        busy += runEnd - runStart;
        runStart = s;
        runEnd = e;
      }
      if (e > maxEnd) maxEnd = e;
    };
    let pending = add;
    for (const i of position) {
      if (i === remove) continue;
      if (pending !== null && pending < i) {
        visit(pending);
        pending = null;
      }
      visit(i);
    }
    if (pending !== null) visit(pending);
    if (first < 0) return EMPTY;
    busy += runEnd - runStart;
    const shift = Math.max(maxEnd, first + minShiftMs) - first;
    return { busyMinutes: busy / MINUTE_MS, shiftMinutes: shift / MINUTE_MS, idleMinutes: (shift - busy) / MINUTE_MS };
  }

  const windowsOf = (position: readonly number[], remove: number | null, add: number | null) =>
    [...position.filter((i) => i !== remove), ...(add === null ? [] : [add])].sort((a, b) => a - b);
  const stats = positions.map((p) => statsWith(p, null, null));

  // The positions left empty at best (6. mérföldkő): a change may not make it grow.
  const deficiencyOf = (list: readonly number[][]) =>
    staffing
      ? deficiency(
          list.filter((p) => p.length > 0).map((p) => positionRequirement(p.map((i) => all[i]))),
          staffing,
        )
      : 0;

  for (let step = 0; step < MAX_STEPS; step++) {
    const current = scoreOf(stats);
    const currentDeficiency = deficiencyOf(positions);
    const candidates: Candidate[] = [];
    const changed = [...stats];
    const consider = (from: number, to: number, x: number, y: number | null) => {
      changed[from] = statsWith(positions[from], x, y);
      changed[to] = statsWith(positions[to], y, x);
      const score = scoreOf(changed);
      changed[from] = stats[from];
      changed[to] = stats[to];
      if (compareScores(score, current) < 0) candidates.push({ score, from, to, x, y });
    };

    for (let from = 0; from < positions.length; from++) {
      for (const x of positions[from]) {
        for (let to = 0; to < positions.length; to++) {
          if (to === from) continue;
          consider(from, to, x, null);
          // Swaps, each pair once.
          if (to > from) for (const y of positions[to]) consider(from, to, x, y);
        }
      }
    }

    // The best change that keeps every rule; the first found on a tie.
    const order = candidates.map((c, i) => ({ c, i }));
    order.sort((a, b) => compareScores(a.c.score, b.c.score) || a.i - b.i);
    let applied = false;
    for (const { c } of order) {
      const newFrom = windowsOf(positions[c.from], c.x, c.y);
      const newTo = windowsOf(positions[c.to], c.y, c.x);
      const asWindows = (p: number[]) => p.map((i) => all[i]);
      if (!fits(asWindows(newFrom), settings) || !fits(asWindows(newTo), settings)) continue;
      if (
        staffing &&
        deficiencyOf(positions.map((p, i) => (i === c.from ? newFrom : i === c.to ? newTo : p))) > currentDeficiency
      ) {
        continue;
      }
      positions[c.from] = newFrom;
      positions[c.to] = newTo;
      stats[c.from] = statsWith(newFrom, null, null);
      stats[c.to] = statsWith(newTo, null, null);
      applied = true;
      break;
    }
    if (!applied) break;
  }
  return positions.map((p) => p.map((i) => all[i]));
}

/** Positions numbered by their first window; empty ones dropped. */
function numbered(positions: PlanWindow[][]): PlanWindow[][] {
  return positions.filter((p) => p.length > 0).sort((a, b) => compareWindows(a[0], b[0]));
}

/**
 * The plan of one day: the fewest positions under the rules, then balanced
 * within the allowed headcount. Of the tried headcounts the best one wins:
 * the fewer positions left empty at best (with the qualifications, 6.
 * mérföldkő), then the smaller spread, less work, less idle time, fewer positions.
 */
export function planDay(windows: readonly PlanWindow[], settings: PlanningSettings, staffing?: Staffing): PlanWindow[][] {
  const base = minimalPositions(windows, settings, staffing);
  if (base.length === 0) return [];
  let best: { positions: PlanWindow[][]; score: number[] } | null = null;
  for (let extra = 0; extra <= settings.extraPositions; extra++) {
    const start = [...base.map((p) => [...p]), ...Array.from({ length: extra }, () => [] as PlanWindow[])];
    const positions = numbered(improve(start, settings, staffing));
    const metrics = metricsOf(positions, settings);
    const empty = staffing ? deficiency(positions.map(positionRequirement), staffing) : 0;
    const score = [empty, metrics.loadSpread, metrics.workMinutes, metrics.idleMinutes, positions.length];
    if (!best || compareScores(score, best.score) < 0) best = { positions, score };
  }
  return best!.positions;
}
