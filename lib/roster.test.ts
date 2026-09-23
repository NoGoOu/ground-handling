import { describe, expect, it } from "vitest";
import { isPublished, segmentDifferences } from "@/lib/roster";
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

const segment = (id: string, typeId: string, start: string, end: string) => ({
  id,
  typeId,
  start: new Date(start),
  end: new Date(end),
});

describe("segment differences", () => {
  const published = [
    segment("p1", "shift", "2026-09-23T04:00Z", "2026-09-23T12:00Z"),
    segment("p2", "trn", "2026-09-23T13:00Z", "2026-09-23T14:30Z"),
  ];

  it("finds nothing when the two layers match", () => {
    const actual = [
      segment("a1", "shift", "2026-09-23T04:00Z", "2026-09-23T12:00Z"),
      segment("a2", "trn", "2026-09-23T13:00Z", "2026-09-23T14:30Z"),
    ];
    expect(segmentDifferences(published, actual)).toEqual({ publishedOnly: [], actualOnly: [] });
  });

  it("marks a changed segment on both sides", () => {
    const actual = [
      segment("a1", "shift", "2026-09-23T06:00Z", "2026-09-23T12:00Z"),
      segment("a2", "trn", "2026-09-23T13:00Z", "2026-09-23T14:30Z"),
    ];
    expect(segmentDifferences(published, actual)).toEqual({ publishedOnly: ["p1"], actualOnly: ["a1"] });
  });

  it("marks a segment that only one layer has", () => {
    const extra = segment("a3", "shift", "2026-09-23T16:00Z", "2026-09-23T18:00Z");
    expect(segmentDifferences(published, [...published.map((p) => ({ ...p, id: `a${p.id}` })), extra])).toEqual({
      publishedOnly: [],
      actualOnly: ["a3"],
    });
    expect(segmentDifferences(published, [])).toEqual({ publishedOnly: ["p1", "p2"], actualOnly: [] });
  });

  it("pairs up repeated segments one by one", () => {
    const twice = [segment("p1", "trn", "2026-09-23T13:00Z", "2026-09-23T14:00Z"), segment("p2", "trn", "2026-09-23T13:00Z", "2026-09-23T14:00Z")];
    const once = [segment("a1", "trn", "2026-09-23T13:00Z", "2026-09-23T14:00Z")];
    expect(segmentDifferences(twice, once)).toEqual({ publishedOnly: ["p2"], actualOnly: [] });
  });
});
