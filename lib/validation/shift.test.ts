import { describe, expect, it } from "vitest";
import { findOverlap, intervalsOverlap, segmentSchema } from "@/lib/validation/shift";

const base = {
  segmentTypeId: "type-1",
  start: "2026-09-23T06:00",
  end: "2026-09-23T14:00",
  location: "",
  description: "",
  createBlock: "",
  travelBeforeMinutes: "",
  travelAfterMinutes: "",
  note: "",
};

const at = (iso: string) => new Date(iso);
const interval = (start: string, end: string) => ({ start: at(start), end: at(end) });

describe("shift segment validation", () => {
  it("reads the local times and defaults the travel minutes to zero", () => {
    const segment = segmentSchema.parse(base);
    expect(segment.start.toISOString()).toBe("2026-09-23T04:00:00.000Z");
    expect(segment.end.toISOString()).toBe("2026-09-23T12:00:00.000Z");
    expect(segment.travelBeforeMinutes).toBe(0);
    expect(segment.createBlock).toBe(false);
  });

  it("accepts a segment that runs over midnight", () => {
    const segment = segmentSchema.parse({ ...base, start: "2026-09-23T22:00", end: "2026-09-24T06:00" });
    expect(segment.end.getTime()).toBeGreaterThan(segment.start.getTime());
  });

  it("requires the end after the start", () => {
    const parsed = segmentSchema.safeParse({ ...base, end: "2026-09-23T06:00" });
    expect(parsed.success).toBe(false);
  });

  it("takes the block flag and the travel minutes", () => {
    const segment = segmentSchema.parse({
      ...base,
      createBlock: "on",
      travelBeforeMinutes: "20",
      travelAfterMinutes: "30",
    });
    expect(segment.createBlock).toBe(true);
    expect(segment.travelBeforeMinutes).toBe(20);
    expect(segment.travelAfterMinutes).toBe(30);
  });

  it("rejects travel minutes that are not whole minutes in range", () => {
    for (const value of ["-5", "1.5", "abc", "481"]) {
      expect(segmentSchema.safeParse({ ...base, travelBeforeMinutes: value }).success, value).toBe(false);
    }
  });

  it("keeps the text fields short", () => {
    expect(segmentSchema.safeParse({ ...base, location: "x".repeat(101) }).success).toBe(false);
    expect(segmentSchema.safeParse({ ...base, description: "x".repeat(201) }).success).toBe(false);
    expect(segmentSchema.safeParse({ ...base, note: "x".repeat(201) }).success).toBe(false);
  });
});

describe("intervals", () => {
  it("treats touching intervals as free (half-open)", () => {
    expect(intervalsOverlap(interval("2026-09-23T06:00Z", "2026-09-23T14:00Z"), interval("2026-09-23T14:00Z", "2026-09-23T22:00Z"))).toBe(false);
    expect(intervalsOverlap(interval("2026-09-23T06:00Z", "2026-09-23T14:01Z"), interval("2026-09-23T14:00Z", "2026-09-23T22:00Z"))).toBe(true);
  });

  it("finds the clashing interval", () => {
    const existing = [interval("2026-09-23T06:00Z", "2026-09-23T10:00Z"), interval("2026-09-23T12:00Z", "2026-09-23T16:00Z")];
    expect(findOverlap(interval("2026-09-23T10:00Z", "2026-09-23T12:00Z"), existing)).toBeNull();
    expect(findOverlap(interval("2026-09-23T11:00Z", "2026-09-23T13:00Z"), existing)).toBe(existing[1]);
  });
});
