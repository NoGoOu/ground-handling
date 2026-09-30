import { describe, expect, it } from "vitest";
import { staffingDay } from "@/lib/staffing/day";
import type { DemandWindow } from "@/lib/staffing/demand";
import { CLOCK_COLUMNS, clockColumns, overviewPeriod, peakOfDays, shiftPeriod } from "@/lib/staffing/overview";
import type { StaffSegment } from "@/lib/staffing/roster";
import { formatTime } from "@/lib/time";

const utc = (iso: string) => new Date(`${iso}:00Z`);
const demand = (from: string, to: string): DemandWindow => ({ start: utc(from), end: utc(to), taskType: "GOU" });
const shift = (from: string, to: string): StaffSegment => ({
  userId: "a",
  start: utc(from),
  end: utc(to),
  operative: true,
  createBlock: false,
  travelBeforeMinutes: 0,
  travelAfterMinutes: 0,
});

describe("the period of the overview", () => {
  const today = "2026-09-30";

  it("is a week from today without parameters", () => {
    expect(overviewPeriod(undefined, undefined, today)).toEqual({ from: "2026-09-30", to: "2026-10-06", days: 7, problem: null });
  });

  it("takes the period asked for, a single day too", () => {
    expect(overviewPeriod("2026-10-01", "2026-10-31", today)).toMatchObject({ days: 31, problem: null });
    expect(overviewPeriod("2026-10-05", "2026-10-05", today)).toMatchObject({ days: 1, problem: null });
    // Only a start: a week from it.
    expect(overviewPeriod("2026-10-05", undefined, today)).toMatchObject({ from: "2026-10-05", to: "2026-10-11", problem: null });
  });

  it("refuses more than 31 days, and does not cut the period", () => {
    expect(overviewPeriod("2026-10-01", "2026-11-01", today)).toEqual({ from: "2026-10-01", to: "2026-11-01", days: 32, problem: "tooLong" });
  });

  it("refuses a period that ends before it starts", () => {
    expect(overviewPeriod("2026-10-05", "2026-10-04", today)).toMatchObject({ days: 0, problem: "order" });
  });

  it("falls back on a broken date", () => {
    expect(overviewPeriod("2026-13-45", "nonsense", today)).toEqual({ from: "2026-09-30", to: "2026-10-06", days: 7, problem: null });
  });

  it("counts the days of a period over the day the clocks change", () => {
    expect(overviewPeriod("2026-10-24", "2026-10-26", today).days).toBe(3);
    expect(overviewPeriod("2026-03-28", "2026-03-30", today).days).toBe(3);
  });

  it("steps by its own length", () => {
    const period = overviewPeriod("2026-10-01", "2026-10-07", today);
    expect(shiftPeriod(period, 1)).toEqual({ from: "2026-10-08", to: "2026-10-14" });
    expect(shiftPeriod(period, -1)).toEqual({ from: "2026-09-24", to: "2026-09-30" });
  });
});

describe("the columns of the overview", () => {
  it("puts the 96 bands of a day under the quarter hours of the clock", () => {
    // 08:00–08:45 and 08:20–09:00 local (UTC+2), one agent on shift.
    const day = staffingDay("2026-09-24", [demand("2026-09-24T06:00", "2026-09-24T06:45"), demand("2026-09-24T06:20", "2026-09-24T07:00")], [
      shift("2026-09-24T04:00", "2026-09-24T12:00"),
    ]);
    const columns = clockColumns(day);
    expect(columns).toHaveLength(CLOCK_COLUMNS);
    expect(columns.every((cell) => cell && !cell.doubled)).toBe(true);
    expect(formatTime(columns[32]!.start)).toBe("08:00");
    expect(columns[32]).toMatchObject({ total: 1, rostered: 1, balance: 0, short: false });
    expect(columns[33]).toMatchObject({ total: 2, rostered: 1, balance: -1, short: true });
    expect(peakOfDays([day])).toBe(2);
  });

  it("leaves the hour that does not exist empty when the clocks go forward", () => {
    const columns = clockColumns(staffingDay("2026-03-29", [], []));
    expect(columns.filter((cell) => cell === null)).toHaveLength(4);
    expect(columns.slice(8, 12)).toEqual([null, null, null, null]);
    expect(formatTime(columns[12]!.start)).toBe("03:00");
  });

  it("shows the higher demand and the larger shortage of the hour that comes twice", () => {
    // The first 02:15 (00:15 UTC) has one task and the agent; the second (01:15 UTC) two tasks and nobody.
    const day = staffingDay(
      "2026-10-25",
      [demand("2026-10-25T00:15", "2026-10-25T00:30"), demand("2026-10-25T01:15", "2026-10-25T01:30"), demand("2026-10-25T01:15", "2026-10-25T01:30")],
      [shift("2026-10-24T22:00", "2026-10-25T01:00")],
    );
    expect(day.bands).toHaveLength(100);
    const columns = clockColumns(day);
    expect(columns).toHaveLength(CLOCK_COLUMNS);
    expect(columns.filter((cell) => cell?.doubled)).toHaveLength(4);
    expect(columns[9]).toMatchObject({ total: 2, rostered: 0, balance: -2, short: true, doubled: true });
    // The first of the two gives the time of the cell.
    expect(columns[9]!.start).toEqual(utc("2026-10-25T00:15"));
    expect(columns[12]).toMatchObject({ doubled: false });
  });

  it("marks no shortage on a day without an actual roster", () => {
    const day = staffingDay("2026-09-24", [demand("2026-09-24T06:00", "2026-09-24T06:45")], []);
    expect(clockColumns(day)[32]).toMatchObject({ total: 1, balance: -1, short: false });
  });

  it("has a scale of at least one on days without work", () => {
    expect(peakOfDays([staffingDay("2026-09-24", [], [])])).toBe(1);
  });
});
