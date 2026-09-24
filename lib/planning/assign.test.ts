import { describe, expect, it } from "vitest";
import { maxConcurrent, minimalPositions } from "@/lib/planning/assign";
import type { PlanWindow } from "@/lib/planning/input";
import { breakOf, freeGaps, shiftOf, violations } from "@/lib/planning/position";
import { DEFAULT_PLANNING_SETTINGS, type PlanningSettings } from "@/lib/planning/settings";

// Step 1 of the algorithm and the rules of a position (CLAUDE.md, 4. mérföldkő).

const DAY = Date.UTC(2026, 8, 24, 4, 0);
/** A window from minute `from` to minute `to` of the day. */
const w = (id: string, from: number, to: number): PlanWindow => ({
  id,
  taskId: id,
  part: "WHOLE",
  start: new Date(DAY + from * 60_000),
  end: new Date(DAY + to * 60_000),
});
const ids = (positions: PlanWindow[][]) => positions.map((p) => p.map((x) => x.id));

/** No rules at all: only the windows themselves count. */
const FREE: PlanningSettings = {
  minShiftMinutes: 0,
  maxShiftMinutes: 100_000,
  breakMinutes: 0,
  breakAfterMinutes: 100_000,
  restMinutes: 0,
  overlapMinutes: 0,
  extraPositions: 0,
};

/** Small deterministic generator (mulberry32), so the random cases repeat. */
function random(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomDay(seed: number): PlanWindow[] {
  const next = random(seed);
  const count = 5 + Math.floor(next() * 60);
  return Array.from({ length: count }, (_, i) => {
    const from = Math.floor(next() * 1200);
    const length = [20, 45, 60, 75][Math.floor(next() * 4)];
    return w(`t${i}`, from, from + length);
  });
}

describe("without rules", () => {
  it("needs as many positions as windows run at once", () => {
    const windows = [w("a", 0, 45), w("b", 30, 75), w("c", 45, 90), w("d", 60, 100), w("e", 200, 245)];
    expect(maxConcurrent(windows)).toBe(3);
    expect(minimalPositions(windows, FREE)).toHaveLength(3);
  });

  it("does not count touching windows as overlapping", () => {
    const windows = [w("a", 0, 45), w("b", 45, 90), w("c", 90, 135)];
    expect(maxConcurrent(windows)).toBe(1);
    expect(ids(minimalPositions(windows, FREE))).toEqual([["a", "b", "c"]]);
  });

  it("reaches the largest overlap on 300 random days", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const windows = randomDay(seed);
      const positions = minimalPositions(windows, FREE);
      expect(positions.length, `seed ${seed}`).toBe(maxConcurrent(windows));
      expect(positions.flat()).toHaveLength(windows.length);
      for (const position of positions) expect(violations(position, FREE), `seed ${seed}`).toEqual([]);
    }
  });

  it("gives the same result for the same input, whatever its order", () => {
    const windows = randomDay(42);
    const again = [...windows].reverse();
    expect(ids(minimalPositions(again, FREE))).toEqual(ids(minimalPositions(windows, FREE)));
  });

  it("takes the position that got free last, then the lower number", () => {
    // a and b end at 45 and 60; c at 60 fits both and goes to b (the smaller gap).
    const windows = [w("a", 0, 45), w("b", 10, 60), w("c", 60, 100)];
    expect(ids(minimalPositions(windows, FREE))).toEqual([["a"], ["b", "c"]]);
  });
});

describe("rest between two tasks", () => {
  const windows = [w("a", 0, 45), w("b", 55, 100)];

  it("opens a new position when the gap is shorter than the rest", () => {
    expect(minimalPositions(windows, { ...FREE, restMinutes: 15 })).toHaveLength(2);
    expect(violations(windows, { ...FREE, restMinutes: 15 })).toEqual(["REST"]);
  });

  it("keeps one position when the gap is exactly the rest", () => {
    expect(minimalPositions(windows, { ...FREE, restMinutes: 10 })).toHaveLength(1);
  });
});

describe("allowed overlap", () => {
  const windows = [w("a", 0, 45), w("b", 35, 80)];

  it("lets two tasks overlap by at most the allowed minutes", () => {
    expect(minimalPositions(windows, FREE)).toHaveLength(2);
    expect(minimalPositions(windows, { ...FREE, overlapMinutes: 10 })).toHaveLength(1);
    expect(minimalPositions(windows, { ...FREE, overlapMinutes: 9 })).toHaveLength(2);
    expect(violations(windows, { ...FREE, overlapMinutes: 9 })).toEqual(["OVERLAP"]);
  });

  it("measures from the latest end, so a long task counts for every later one", () => {
    // b and c both start inside a: c overlaps a by 40 minutes, not b by 0.
    const nested = [w("a", 0, 100), w("b", 50, 60), w("c", 60, 70)];
    expect(violations(nested, { ...FREE, overlapMinutes: 50 })).toEqual([]);
    expect(violations(nested, { ...FREE, overlapMinutes: 39 })).toEqual(["OVERLAP"]);
  });
});

describe("shift length", () => {
  it("pushes a short shift out to the minimum", () => {
    const shift = shiftOf([w("a", 0, 45)], DEFAULT_PLANNING_SETTINGS)!;
    expect((shift.end.getTime() - shift.start.getTime()) / 60_000).toBe(240);
  });

  it("opens a new position rather than go over the maximum", () => {
    const windows = [w("a", 0, 45), w("b", 100, 145), w("c", 200, 245)];
    expect(ids(minimalPositions(windows, { ...FREE, maxShiftMinutes: 200 }))).toEqual([["a", "b"], ["c"]]);
    expect(violations(windows, { ...FREE, maxShiftMinutes: 200 })).toEqual(["MAX_SHIFT"]);
  });
});

describe("break", () => {
  const rules = { ...FREE, breakMinutes: 20, breakAfterMinutes: 360 };

  it("is needed only above the threshold", () => {
    const sixHours = [w("a", 0, 180), w("b", 180, 360)];
    expect(violations(sixHours, rules)).toEqual([]);
    expect(breakOf(sixHours, rules)).toBeNull();
  });

  it("closes a position that would work past the threshold without a gap long enough", () => {
    const windows = [w("a", 0, 180), w("b", 190, 370)];
    expect(violations(windows, rules)).toEqual(["BREAK"]);
    expect(minimalPositions(windows, rules)).toHaveLength(2);
  });

  it("marks the gap nearest the middle of the shift as the break", () => {
    const windows = [w("a", 0, 100), w("b", 125, 200), w("c", 230, 300), w("d", 330, 400)];
    expect(violations(windows, rules)).toEqual([]);
    expect(minimalPositions(windows, rules)).toHaveLength(1);
    // Gaps: 100–125, 200–230, 300–330; the shift's middle is 200.
    expect(breakOf(windows, rules)).toEqual({ start: w("x", 200, 230).start, end: w("x", 200, 230).end });
  });

  it("counts the free end of a shift pushed out to its minimum", () => {
    const long = { ...rules, minShiftMinutes: 400 };
    const windows = [w("a", 0, 45)];
    expect(freeGaps(windows, long)).toEqual([{ start: w("x", 45, 400).start, end: w("x", 45, 400).end }]);
    expect(violations(windows, long)).toEqual([]);
  });
});

describe("with the default settings", () => {
  it("still covers every window exactly once, and keeps every rule", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const windows = randomDay(seed);
      const positions = minimalPositions(windows, DEFAULT_PLANNING_SETTINGS);
      expect(positions.flat().map((x) => x.id).sort()).toEqual(windows.map((x) => x.id).sort());
      for (const position of positions) expect(violations(position, DEFAULT_PLANNING_SETTINGS)).toEqual([]);
    }
  });
});
