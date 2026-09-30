import { describe, expect, it } from "vitest";
import { staffingDay } from "@/lib/staffing/day";
import type { DemandWindow } from "@/lib/staffing/demand";
import type { StaffSegment } from "@/lib/staffing/roster";
import { formatTime } from "@/lib/time";

// One day of the staffing demand from windows and segments that may reach
// beyond it (CLAUDE.md, 9. mérföldkő: the windows that overlap the day, not
// only those that start on it as in the planner).

/** Budapest is UTC+2 in September; hours past 24 run into the next day. */
const local = (hhmm: string, day = "2026-09-24") => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.parse(`${day}T00:00:00Z`) + ((h - 2) * 60 + m) * 60_000);
};
const demand = (from: string, to: string, taskType = "GOU"): DemandWindow => ({ start: local(from), end: local(to), taskType });
const segment = (userId: string, from: string, to: string, rest: Partial<StaffSegment> = {}): StaffSegment => ({
  userId,
  start: local(from),
  end: local(to),
  operative: true,
  createBlock: false,
  travelBeforeMinutes: 0,
  travelAfterMinutes: 0,
  ...rest,
});
const busy = (day: ReturnType<typeof staffingDay>) => day.bands.filter((b) => b.total > 0).map((b) => formatTime(b.start));

describe("a day of the staffing demand", () => {
  it("counts a window over midnight on the day it starts and on the day it ends", () => {
    const windows = [demand("23:50", "24:35")];
    expect(busy(staffingDay("2026-09-24", windows, []))).toEqual(["23:45"]);
    // The planner would give the window to the 24th only; the demand of the 25th has it too.
    expect(busy(staffingDay("2026-09-25", windows, []))).toEqual(["00:00", "00:15", "00:30"]);
    expect(busy(staffingDay("2026-09-26", windows, []))).toEqual([]);
  });

  it("lists only the task types with work on the day", () => {
    const windows = [demand("08:00", "08:45", "HDS"), demand("09:00", "09:45", "GOU"), demand("33:00", "33:45", "XYZ")];
    const day = staffingDay("2026-09-24", windows, []);
    expect(day.taskTypes).toEqual(["GOU", "HDS"]);
    expect(Object.keys(day.bands[0].byType)).toEqual(["GOU", "HDS"]);
    expect(staffingDay("2026-09-25", windows, []).taskTypes).toEqual(["XYZ"]);
  });

  it("sets the demand against the roster, band by band", () => {
    const day = staffingDay("2026-09-24", [demand("08:00", "08:45"), demand("08:20", "09:00")], [segment("a", "06:00", "14:00")]);
    const at = (hhmm: string) => day.bands.find((b) => formatTime(b.start) === hhmm)!;
    expect(day.bands).toHaveLength(96);
    expect(at("08:00")).toMatchObject({ total: 1, rostered: 1, balance: 0 });
    expect(at("08:15")).toMatchObject({ total: 2, rostered: 1, balance: -1 });
    expect(at("12:00")).toMatchObject({ total: 0, rostered: 1, balance: 1 });
    expect(day.hasRoster).toBe(true);
  });

  it("knows a day without any actual roster", () => {
    const shifts = [segment("a", "06:00", "14:00")];
    expect(staffingDay("2026-09-25", [], shifts).hasRoster).toBe(false);
    // A shift over midnight is roster on both days.
    const night = [segment("a", "22:00", "30:00")];
    expect(staffingDay("2026-09-24", [], night).hasRoster).toBe(true);
    expect(staffingDay("2026-09-25", [], night).hasRoster).toBe(true);
    expect(staffingDay("2026-09-26", [], night).hasRoster).toBe(false);
  });

  it("takes the travel time of yesterday's block out of today's first band", () => {
    const segments = [
      segment("a", "20:00", "24:00", { operative: false, createBlock: true, travelAfterMinutes: 20 }),
      segment("a", "24:00", "30:00"),
    ];
    const day = staffingDay("2026-09-25", [], segments);
    expect(day.bands.slice(0, 3).map((b) => b.rostered)).toEqual([0, 0, 1]);
  });
});
