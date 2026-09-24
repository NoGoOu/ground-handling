import { describe, expect, it } from "vitest";
import { maxConcurrent, minimalPositions } from "@/lib/planning/assign";
import { compareScores, metricsOf, planDay } from "@/lib/planning/balance";
import type { PlanWindow } from "@/lib/planning/input";
import { violations } from "@/lib/planning/position";
import { DEFAULT_PLANNING_SETTINGS, type PlanningSettings } from "@/lib/planning/settings";

// Steps 2–3 of the algorithm: balancing, tie-breaks and the indicators
// (CLAUDE.md, 4. mérföldkő, "Cél és algoritmus").

const DAY = Date.UTC(2026, 8, 24, 4, 0);
const w = (id: string, from: number, to: number): PlanWindow => ({
  id,
  taskId: id,
  part: "WHOLE",
  start: new Date(DAY + from * 60_000),
  end: new Date(DAY + to * 60_000),
});
const ids = (positions: PlanWindow[][]) => positions.map((p) => p.map((x) => x.id));

const FREE: PlanningSettings = {
  minShiftMinutes: 0,
  maxShiftMinutes: 100_000,
  breakMinutes: 0,
  breakAfterMinutes: 100_000,
  restMinutes: 0,
  overlapMinutes: 0,
  extraPositions: 0,
};

function random(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomDay(seed: number, count?: number): PlanWindow[] {
  const next = random(seed);
  const n = count ?? 5 + Math.floor(next() * 40);
  return Array.from({ length: n }, (_, i) => {
    const from = Math.floor(next() * 1200);
    const length = [20, 45, 60, 75][Math.floor(next() * 4)];
    return w(`t${i}`, from, from + length);
  });
}

describe("balancing", () => {
  // x and y run at once (two positions); s1–s3 follow. Step 1 puts every s into position 1.
  const windows = [w("x", 0, 45), w("y", 0, 45), w("s1", 100, 190), w("s2", 200, 290), w("s3", 300, 390)];

  it("evens out the load of the minimal positions", () => {
    const greedy = metricsOf(minimalPositions(windows, FREE), FREE);
    expect(greedy.loadSpread).toBe(270);
    const plan = planDay(windows, FREE);
    expect(plan).toHaveLength(2);
    expect(metricsOf(plan, FREE).loadSpread).toBe(90);
  });

  it("uses an allowed extra position when that evens the load further", () => {
    const plan = planDay(windows, { ...FREE, extraPositions: 1 });
    expect(plan).toHaveLength(3);
    expect(metricsOf(plan, FREE).loadSpread).toBe(45);
  });

  it("never goes above the minimum + the allowed extra positions", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const day = randomDay(seed);
      const minimum = minimalPositions(day, DEFAULT_PLANNING_SETTINGS).length;
      for (const extra of [0, 1, 2]) {
        const plan = planDay(day, { ...DEFAULT_PLANNING_SETTINGS, extraPositions: extra });
        expect(plan.length, `seed ${seed}`).toBeLessThanOrEqual(minimum + extra);
      }
    }
  });

  it("keeps every rule and every window", () => {
    const settings = { ...DEFAULT_PLANNING_SETTINGS, restMinutes: 10, extraPositions: 1 };
    for (let seed = 1; seed <= 40; seed++) {
      const day = randomDay(seed);
      const plan = planDay(day, settings);
      expect(plan.flat().map((x) => x.id).sort()).toEqual(day.map((x) => x.id).sort());
      for (const position of plan) expect(violations(position, settings), `seed ${seed}`).toEqual([]);
    }
  });

  it("is never worse than step 1 alone", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const day = randomDay(seed);
      const before = metricsOf(minimalPositions(day, DEFAULT_PLANNING_SETTINGS), DEFAULT_PLANNING_SETTINGS);
      const after = metricsOf(planDay(day, DEFAULT_PLANNING_SETTINGS), DEFAULT_PLANNING_SETTINGS);
      const score = (m: typeof before) => [m.loadSpread, m.workMinutes, m.idleMinutes];
      expect(compareScores(score(after), score(before)), `seed ${seed}`).toBeLessThanOrEqual(0);
    }
  });

  it("keeps the minimal count without rules", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const day = randomDay(seed);
      expect(planDay(day, FREE).length, `seed ${seed}`).toBe(maxConcurrent(day));
    }
  });
});

describe("the same input", () => {
  it("always gives the same plan, whatever the order of the windows", () => {
    for (const seed of [3, 17, 99]) {
      const day = randomDay(seed);
      const first = ids(planDay(day, DEFAULT_PLANNING_SETTINGS));
      expect(ids(planDay([...day].reverse(), DEFAULT_PLANNING_SETTINGS))).toEqual(first);
      expect(ids(planDay(day, DEFAULT_PLANNING_SETTINGS))).toEqual(first);
    }
  });

  it("numbers the positions by their first window", () => {
    const plan = planDay(randomDay(7), DEFAULT_PLANNING_SETTINGS);
    const firsts = plan.map((p) => p[0].start.getTime());
    expect(firsts).toEqual([...firsts].sort((a, b) => a - b));
  });

  it("stays quick on a busy day", () => {
    const busy = randomDay(5, 90);
    const started = performance.now();
    planDay(busy, { ...DEFAULT_PLANNING_SETTINGS, extraPositions: 1 });
    expect(performance.now() - started).toBeLessThan(5000);
  });
});

describe("tie-breaks", () => {
  it("compare the spread first, then work, then idle", () => {
    expect(compareScores([10, 900, 50], [20, 100, 0])).toBeLessThan(0);
    expect(compareScores([10, 500, 50], [10, 600, 0])).toBeLessThan(0);
    expect(compareScores([10, 500, 20], [10, 500, 30])).toBeLessThan(0);
    expect(compareScores([10, 500, 20], [10, 500, 20])).toBe(0);
  });
});

describe("indicators", () => {
  it("count positions, busy, shift and idle minutes, work and the load range", () => {
    const settings = { ...FREE, minShiftMinutes: 240 };
    const metrics = metricsOf([[w("a", 0, 45), w("b", 100, 145)], [w("c", 0, 300)]], settings);
    expect(metrics).toEqual({
      positions: 2,
      perPosition: [
        { busyMinutes: 90, shiftMinutes: 240, idleMinutes: 150 },
        { busyMinutes: 300, shiftMinutes: 300, idleMinutes: 0 },
      ],
      workMinutes: 540,
      idleMinutes: 150,
      loadMin: 90,
      loadMax: 300,
      loadSpread: 210,
    });
  });
});
