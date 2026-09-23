import { describe, expect, it } from "vitest";
import { isPublished } from "@/lib/roster";
import { localDayRange } from "@/lib/time";

const period = (start: string, end: string) => ({
  startDate: localDayRange(start).start,
  endDate: localDayRange(end).start,
});

describe("published days", () => {
  const publications = [period("2026-09-28", "2026-10-04")];

  it("covers both ends of the period", () => {
    expect(isPublished("2026-09-28", publications)).toBe(true);
    expect(isPublished("2026-10-01", publications)).toBe(true);
    expect(isPublished("2026-10-04", publications)).toBe(true);
  });

  it("leaves the days outside open", () => {
    expect(isPublished("2026-09-27", publications)).toBe(false);
    expect(isPublished("2026-10-05", publications)).toBe(false);
    expect(isPublished("2026-09-28", [])).toBe(false);
  });
});
