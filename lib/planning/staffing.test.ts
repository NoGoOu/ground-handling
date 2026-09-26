import { describe, expect, it } from "vitest";
import { maxConcurrent, minimalPositions } from "@/lib/planning/assign";
import { planDay } from "@/lib/planning/balance";
import type { PlanWindow } from "@/lib/planning/input";
import type { PlanningSettings } from "@/lib/planning/settings";
import {
  dayStaffing,
  deficiency,
  matchPositions,
  positionRequirement,
  shortage,
  type Staffing,
} from "@/lib/planning/staffing";

// Whether a day's positions can be staffed (CLAUDE.md, 6. mérföldkő, "Tervező").

const people = (...agents: string[][]): Staffing => ({ agents: agents.map((ids) => new Set(ids)) });

// 3 with PRM and 3 with DG; only A has both.
const STAFF = people(["PRM", "DG"], ["PRM"], ["PRM"], ["DG"], ["DG"]);

describe("staffing a day", () => {
  it("fills positions with different people who hold what each one needs", () => {
    expect(matchPositions([["PRM"], ["DG"], ["PRM", "DG"]], STAFF)).toEqual([1, 3, 0]);
    expect(deficiency([["PRM"], ["DG"], ["PRM", "DG"]], STAFF)).toBe(0);
  });

  it("sees that two positions cannot both need PRM and DG, though the counts would allow it", () => {
    const both = [
      ["PRM", "DG"],
      ["PRM", "DG"],
    ];
    expect(deficiency(both, STAFF)).toBe(1);
    const found = shortage(both, STAFF);
    expect(found.unfilled).toEqual([1]);
    expect(found.perQualification).toEqual([
      { qualificationId: "DG", need: 2, have: 3 },
      { qualificationId: "PRM", need: 2, have: 3 },
    ]);
  });

  it("moves an earlier choice aside when that fills one more position", () => {
    // A first goes to a PRM position; the PRM+DG one takes A over, the others move on.
    const matched = matchPositions([["PRM"], ["PRM"], ["PRM", "DG"]], STAFF);
    expect(matched[2]).toBe(0);
    expect(new Set(matched).size).toBe(3);
    expect(deficiency([["PRM"], ["PRM"], ["PRM", "DG"]], STAFF)).toBe(0);
  });

  it("counts the shortage per qualification", () => {
    const four = [["PRM"], ["PRM"], ["PRM"], ["PRM"]];
    expect(shortage(four, STAFF)).toEqual({ unfilled: [3], perQualification: [{ qualificationId: "PRM", need: 4, have: 3 }] });
  });

  it("needs a person for a position without requirements too", () => {
    expect(deficiency([[], [], []], people(["X"], []))).toBe(1);
    expect(deficiency([[], []], people(["X"], []))).toBe(0);
  });
});

describe("the planner with qualifications", () => {
  const DAY = Date.UTC(2026, 8, 25, 4, 0);
  const w = (id: string, from: number, to: number, requires: string[] = []): PlanWindow => ({
    id,
    taskId: id,
    part: "WHOLE",
    start: new Date(DAY + from * 60_000),
    end: new Date(DAY + to * 60_000),
    requires,
  });
  const FREE: PlanningSettings = {
    minShiftMinutes: 0,
    maxShiftMinutes: 100_000,
    breakMinutes: 0,
    breakAfterMinutes: 100_000,
    restMinutes: 0,
    overlapMinutes: 0,
    extraPositions: 0,
  };
  const needs = (positions: PlanWindow[][]) => positions.map(positionRequirement);
  const ids = (positions: PlanWindow[][]) => positions.map((p) => p.map((x) => x.id));

  // PRM and DG work in the morning and again an hour later. In the plan order
  // the later PRM window comes first, so a blind choice mixes the two.
  const day = [w("dg1", 0, 45, ["DG"]), w("prm1", 0, 45, ["PRM"]), w("a-prm", 60, 100, ["PRM"]), w("b-dg", 60, 100, ["DG"])];

  it("keeps the 3 PRM / 3 DG / 1 both case staffable", () => {
    // Without the qualifications both positions would need PRM and DG: only one person has both.
    const blind = minimalPositions(day, FREE);
    expect(deficiency(needs(blind), STAFF)).toBe(1);
    // With them each position keeps to one qualification.
    const aware = minimalPositions(day, FREE, STAFF);
    expect(ids(aware)).toEqual([
      ["dg1", "b-dg"],
      ["prm1", "a-prm"],
    ]);
    expect(deficiency(needs(aware), STAFF)).toBe(0);
    expect(deficiency(needs(planDay(day, FREE, STAFF)), STAFF)).toBe(0);
  });

  it("still makes the plan when the day cannot be staffed, and says what is short", () => {
    const four = [0, 1, 2, 3].map((i) => w(`p${i}`, 0, 45, ["PRM"]));
    const plan = planDay(four, FREE, STAFF);
    expect(plan).toHaveLength(4);
    expect(shortage(needs(plan), STAFF)).toEqual({
      unfilled: [3],
      perQualification: [{ qualificationId: "PRM", need: 4, have: 3 }],
    });
  });

  it("changes nothing without requirements", () => {
    const plain = [w("a", 0, 45), w("b", 30, 75), w("c", 45, 90), w("d", 60, 100)];
    expect(ids(minimalPositions(plain, FREE, STAFF))).toEqual(ids(minimalPositions(plain, FREE)));
    expect(minimalPositions(plain, FREE, STAFF)).toHaveLength(maxConcurrent(plain));
  });

  it("never lets the balancing leave more positions empty", () => {
    const codes = ["PRM", "DG", "ALT"];
    for (let seed = 1; seed <= 30; seed++) {
      let a = seed;
      const next = () => ((a = (a * 1103515245 + 12345) % 2147483648) / 2147483648);
      const windows = Array.from({ length: 12 }, (_, i) => {
        const from = Math.floor(next() * 600);
        return w(`t${i}`, from, from + 45, next() < 0.5 ? [codes[Math.floor(next() * 3)]] : []);
      });
      const staff = people(["PRM", "DG"], ["PRM"], ["DG"], ["ALT"], [], []);
      const greedy = deficiency(needs(minimalPositions(windows, FREE, staff)), staff);
      expect(deficiency(needs(planDay(windows, FREE, staff)), staff), `seed ${seed}`).toBeLessThanOrEqual(greedy);
    }
  });
});

describe("the staffing report of a plan day", () => {
  // HA passed on 2025-10-10 for 12 months: valid until 2026-10-10.
  const records = (qualificationId: string, completedOn: string, validUntil: string | null) => [
    { id: qualificationId, qualificationId, completedOn, passed: true, validUntil, createdAt: new Date(0) },
  ];
  const anna = records("HA", "2025-10-10", "2026-10-10");

  it("checks validity on the plan day, not on today (rule 39)", () => {
    // Still valid on the day the plan is made, expired by the plan day.
    const before = dayStaffing([["HA"]], [anna], "2026-10-10");
    expect(before.unfilled).toEqual([]);
    expect(before.lacks[0][0]).toEqual([]);
    const after = dayStaffing([["HA"]], [anna], "2026-10-15");
    expect(after.unfilled).toEqual([0]);
    expect(after.lacks[0][0]).toEqual([{ qualificationId: "HA", status: "EXPIRED" }]);
    expect(after.perQualification).toEqual([{ qualificationId: "HA", need: 1, have: 0 }]);
  });

  it("needs nobody for a position without windows", () => {
    const report = dayStaffing([["HA"], null, []], [anna], "2026-10-01");
    expect(report.unfilled).toEqual([2]);
    expect(report.lacks[1][0]).toEqual([]);
  });
});
