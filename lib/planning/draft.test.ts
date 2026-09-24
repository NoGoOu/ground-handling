import { describe, expect, it } from "vitest";
import type { PlanWindow } from "@/lib/planning/input";
import { draftConflicts, draftPlan, type DraftPosition } from "@/lib/planning/draft";
import { DEFAULT_PLANNING_SETTINGS } from "@/lib/planning/settings";
import { localDayRange } from "@/lib/time";

// "Mentés a tervezetbe" (CLAUDE.md, 4. mérföldkő, "Nevek és tervezet").

/** Minutes after 06:00 Budapest (04:00 UTC) on the given September day. */
const at = (day: number, minute: number) => new Date(Date.UTC(2026, 8, day, 4, 0) + minute * 60_000);
const w = (id: string, day: number, from: number, to: number): PlanWindow => ({
  id,
  taskId: id,
  part: "WHOLE",
  start: at(day, from),
  end: at(day, to),
});
const position = (day: number, number: number, userId: string | null, windows: PlanWindow[]): DraftPosition => ({
  dayId: `d${day}`,
  day: `2026-09-${day}`,
  number,
  userId,
  userName: userId && `Name ${userId}`,
  windows,
  settings: DEFAULT_PLANNING_SETTINGS,
});
const days = ["2026-09-24", "2026-09-25", "2026-09-26"];
const published = (day: string) => ({ startDate: localDayRange(day).start, endDate: localDayRange(day).start });

describe("the draft of a plan", () => {
  const positions = [
    position(24, 1, "u1", [w("a", 24, 0, 45), w("b", 24, 100, 145)]),
    position(24, 2, null, [w("c", 24, 30, 75)]),
    position(25, 1, "u2", [w("d", 25, 0, 45)]),
    position(26, 1, "u1", [w("e", 26, 0, 500)]),
  ];

  it("makes a shift per named position, pushed out to the minimum length", () => {
    const draft = draftPlan(positions, days, []);
    expect(draft.shifts.map((s) => [s.day, s.number, s.userId])).toEqual([
      ["2026-09-24", 1, "u1"],
      ["2026-09-25", 1, "u2"],
      ["2026-09-26", 1, "u1"],
    ]);
    expect(draft.shifts[0]).toMatchObject({ start: at(24, 0), end: at(24, 240) });
    expect(draft.shifts[2]).toMatchObject({ start: at(26, 0), end: at(26, 500) });
    expect(draft.unnamed).toEqual([{ day: "2026-09-24", number: 2 }]);
    expect(draft.savedDays).toEqual(days);
  });

  it("skips the published days", () => {
    const draft = draftPlan(positions, days, [published("2026-09-25")]);
    expect(draft.shifts.map((s) => s.day)).toEqual(["2026-09-24", "2026-09-26"]);
    expect(draft.publishedDays).toEqual(["2026-09-25"]);
    expect(draft.savedDays).toEqual(["2026-09-24", "2026-09-26"]);
  });
});

describe("conflicts with the draft layer", () => {
  const shifts = draftPlan(
    [position(24, 1, "u1", [w("a", 24, 0, 45)]), position(24, 2, "u2", [w("b", 24, 0, 45)])],
    days,
    [],
  ).shifts;

  it("finds a draft shift of the same agent that overlaps", () => {
    const existing = [{ userId: "u1", start: at(24, 200), end: at(24, 600) }];
    expect(draftConflicts(shifts, existing)).toEqual([
      { day: "2026-09-24", number: 1, userName: "Name u1", clash: { start: at(24, 200), end: at(24, 600) } },
    ]);
  });

  it("lets touching shifts and other agents be", () => {
    const existing = [
      { userId: "u1", start: at(24, 240), end: at(24, 600) },
      { userId: "u3", start: at(24, 0), end: at(24, 600) },
    ];
    expect(draftConflicts(shifts, existing)).toEqual([]);
  });

  it("finds the same agent named for two overlapping positions", () => {
    const twice = draftPlan(
      [position(24, 1, "u1", [w("a", 24, 0, 45)]), position(24, 2, "u1", [w("b", 24, 60, 90)])],
      days,
      [],
    ).shifts;
    expect(draftConflicts(twice, [])).toMatchObject([{ number: 2, userName: "Name u1" }]);
  });
});
