import { describe, expect, it } from "vitest";
import { dayBands } from "@/lib/staffing/bands";
import { countTicks, hourMarks, raisedStepPath, runsOf, stepPath } from "@/lib/staffing/chart";
import { staffingDay } from "@/lib/staffing/day";
import type { DemandWindow } from "@/lib/staffing/demand";
import type { StaffSegment } from "@/lib/staffing/roster";
import { isShort, summaryOf } from "@/lib/staffing/summary";
import { formatTime } from "@/lib/time";

/** Budapest is UTC+2 in September. */
const local = (hhmm: string, day = "2026-09-24") => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.parse(`${day}T00:00:00Z`) + ((h - 2) * 60 + m) * 60_000);
};
const demand = (from: string, to: string): DemandWindow => ({ start: local(from), end: local(to), taskType: "GOU" });
const shift = (userId: string, from: string, to: string): StaffSegment => ({
  userId,
  start: local(from),
  end: local(to),
  operative: true,
  createBlock: false,
  travelBeforeMinutes: 0,
  travelAfterMinutes: 0,
});

describe("the summary of a day", () => {
  const windows = [demand("08:00", "08:45"), demand("08:20", "09:00"), demand("16:00", "16:40"), demand("16:10", "16:40"), demand("16:15", "16:30")];

  it("gives the peak with the time of its first band, and the largest shortage", () => {
    const summary = summaryOf(staffingDay("2026-09-24", windows, [shift("a", "06:00", "18:00")]));
    expect(summary.peak).toBe(3);
    expect(formatTime(summary.peakAt!)).toBe("16:15");
    expect(summary.shortage).toBe(2);
    expect(formatTime(summary.shortageAt!)).toBe("16:15");
    // 08:15 and 08:30 are one short, 16:00 one, 16:15 two, 16:30 one.
    expect(summary.shortBands).toBe(5);
  });

  it("has no shortage when the roster covers the demand", () => {
    const summary = summaryOf(staffingDay("2026-09-24", windows, [shift("a", "06:00", "18:00"), shift("b", "06:00", "18:00"), shift("c", "06:00", "18:00")]));
    expect(summary).toMatchObject({ peak: 3, shortage: 0, shortageAt: null, shortBands: 0 });
  });

  it("marks no shortage on a day without any actual roster, though the demand shows", () => {
    const day = staffingDay("2026-09-24", windows, []);
    expect(day.bands.some((band) => band.balance < 0)).toBe(true);
    expect(day.bands.some((band) => isShort(day, band))).toBe(false);
    expect(summaryOf(day)).toMatchObject({ peak: 3, shortage: 0, shortageAt: null, shortBands: 0 });
  });

  it("marks a shortage outside the shift once the day has a roster", () => {
    const day = staffingDay("2026-09-24", windows, [shift("a", "06:00", "12:00")]);
    expect(formatTime(summaryOf(day).shortageAt!)).toBe("16:15");
    expect(summaryOf(day).shortage).toBe(3);
  });

  it("is empty on a day without work", () => {
    expect(summaryOf(staffingDay("2026-09-24", [], []))).toEqual({ peak: 0, peakAt: null, shortage: 0, shortageAt: null, shortBands: 0 });
  });
});

describe("the step chart", () => {
  const x = (index: number) => index * 10;
  const y = (value: number) => 100 - value * 20;

  it("draws a line of steps: a band keeps its value to the start of the next", () => {
    expect(stepPath([1, 1, 3, 0], x, y)).toBe("M0 80 H10 H20 V40 H30 V100 H40");
  });

  it("closes the area down to the baseline", () => {
    expect(stepPath([2, 0], x, y, 0)).toBe("M0 60 H10 V100 H20 V100 H0 Z");
  });

  it("draws nothing without bands", () => {
    expect(stepPath([], x, y)).toBe("");
  });

  it("draws a task type only where it has work, each run standing on the baseline", () => {
    expect(raisedStepPath([0, 1, 2, 0, 0, 1], x, y)).toBe("M10 100 V80 H20 V60 H30 V100 M50 100 V80 H60 V100");
    expect(raisedStepPath([0, 0], x, y)).toBe("");
  });

  it("marks the full hours, also on the days the clocks change", () => {
    expect(hourMarks(dayBands("2026-09-24")).map((m) => m.label)).toEqual(
      Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0")),
    );
    const spring = hourMarks(dayBands("2026-03-29"));
    expect(spring).toHaveLength(23);
    expect(spring.slice(0, 4)).toEqual([
      { index: 0, label: "00" },
      { index: 4, label: "01" },
      { index: 8, label: "03" },
      { index: 12, label: "04" },
    ]);
    const autumn = hourMarks(dayBands("2026-10-25"));
    expect(autumn).toHaveLength(25);
    expect(autumn.slice(2, 5).map((m) => m.label)).toEqual(["02", "02", "03"]);
  });

  it("gives whole ticks up to the top", () => {
    expect(countTicks(0)).toEqual([0, 1]);
    expect(countTicks(4)).toEqual([0, 1, 2, 3, 4]);
    expect(countTicks(6)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(countTicks(7)).toEqual([0, 2, 4, 6, 8]);
    expect(countTicks(25)).toEqual([0, 5, 10, 15, 20, 25]);
  });

  it("joins neighbouring bands into runs", () => {
    const short = [false, true, true, false, true];
    expect(runsOf(short.length, (i) => short[i])).toEqual([
      [1, 3],
      [4, 5],
    ]);
  });
});
