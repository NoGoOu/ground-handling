import { describe, expect, it } from "vitest";
import {
  addDays,
  formatDayShort,
  formatTime,
  formatTimeOnDay,
  localDayRange,
  localToUtc,
  parseLocalDate,
  parseLocalDateTime,
  toLocalDate,
  toLocalDateTimeInput,
  startOfWeek,
  weekdayIndex,
} from "@/lib/time";

describe("Budapest time conversion", () => {
  it("is UTC+2 in summer and UTC+1 in winter", () => {
    expect(localToUtc(2026, 9, 22, 10, 0).toISOString()).toBe("2026-09-22T08:00:00.000Z");
    expect(localToUtc(2026, 12, 1, 10, 0).toISOString()).toBe("2026-12-01T09:00:00.000Z");
  });

  it("handles the days around the DST changes", () => {
    // 2026-03-29: 02:00 → 03:00, 2026-10-25: 03:00 → 02:00.
    expect(localToUtc(2026, 3, 29, 1, 30).toISOString()).toBe("2026-03-29T00:30:00.000Z");
    expect(localToUtc(2026, 3, 29, 3, 30).toISOString()).toBe("2026-03-29T01:30:00.000Z");
    expect(localToUtc(2026, 10, 25, 1, 30).toISOString()).toBe("2026-10-24T23:30:00.000Z");
    expect(localToUtc(2026, 10, 25, 4, 0).toISOString()).toBe("2026-10-25T03:00:00.000Z");
  });

  it("formats instants in local time", () => {
    const instant = new Date("2026-09-22T22:30:00Z");
    expect(formatTime(instant)).toBe("00:30");
    expect(toLocalDate(instant)).toBe("2026-09-23");
    expect(toLocalDateTimeInput(instant)).toBe("2026-09-23T00:30");
  });

  it("adds the date when the time is on another day", () => {
    const instant = new Date("2026-09-22T22:30:00Z");
    expect(formatTimeOnDay(instant, "2026-09-23")).toBe("00:30");
    expect(formatTimeOnDay(instant, "2026-09-22")).toBe("09.23. 00:30");
  });
});

describe("parsing form values", () => {
  it("parses datetime-local values as Budapest time", () => {
    expect(parseLocalDateTime("2026-09-22T10:15")?.toISOString()).toBe("2026-09-22T08:15:00.000Z");
  });

  it("rejects malformed or impossible values", () => {
    expect(parseLocalDateTime("")).toBeNull();
    expect(parseLocalDateTime("2026-09-22 10:15")).toBeNull();
    expect(parseLocalDateTime("2026-02-30T10:15")).toBeNull();
    expect(parseLocalDateTime("2026-09-22T24:00")).toBeNull();
    expect(parseLocalDate("2026-13-01")).toBeNull();
  });

  it("round-trips through the input format", () => {
    const instant = parseLocalDateTime("2026-10-25T01:45")!;
    expect(toLocalDateTimeInput(instant)).toBe("2026-10-25T01:45");
  });
});

describe("calendar days", () => {
  it("adds days across month ends", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("gives the UTC range of a local day, including 23 and 25 hour days", () => {
    const normal = localDayRange("2026-09-22");
    expect(normal.start.toISOString()).toBe("2026-09-21T22:00:00.000Z");
    expect(normal.end.toISOString()).toBe("2026-09-22T22:00:00.000Z");

    const hours = (r: { start: Date; end: Date }) => (r.end.getTime() - r.start.getTime()) / 3_600_000;
    expect(hours(localDayRange("2026-03-29"))).toBe(23);
    expect(hours(localDayRange("2026-10-25"))).toBe(25);
  });
});

describe("week helpers", () => {
  it("counts the week from Monday", () => {
    expect(weekdayIndex("2026-09-21")).toBe(0); // Monday
    expect(weekdayIndex("2026-09-23")).toBe(2);
    expect(weekdayIndex("2026-09-27")).toBe(6); // Sunday
  });

  it("steps back to the Monday of the same week", () => {
    expect(startOfWeek("2026-09-23")).toBe("2026-09-21");
    expect(startOfWeek("2026-09-21")).toBe("2026-09-21");
    expect(startOfWeek("2026-09-27")).toBe("2026-09-21");
  });

  it("formats a short day label", () => {
    expect(formatDayShort("2026-09-03")).toBe("09. 03.");
  });
});
