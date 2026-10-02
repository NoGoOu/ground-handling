import { describe, expect, it } from "vitest";
import { isPublished, ownRosterDays, sameSegments, segmentDifferences, type DayShift } from "@/lib/roster";
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

describe("matching layers", () => {
  it("matches the same segments in any order, and nothing else", () => {
    const a = [segment("x", "shift", "2026-09-23T04:00Z", "2026-09-23T12:00Z"), segment("y", "trn", "2026-09-23T13:00Z", "2026-09-23T14:30Z")];
    expect(sameSegments(a, [...a].reverse())).toBe(true);
    expect(sameSegments([], [])).toBe(true);
    expect(sameSegments(a, a.slice(1))).toBe(false);
    expect(sameSegments(a, [{ ...a[0], typeId: "trn" }, a[1]])).toBe(false);
    expect(sameSegments(a, [{ ...a[0], end: new Date("2026-09-23T12:01Z") }, a[1]])).toBe(false);
  });
});

describe("the agent's own roster (12. mérföldkő)", () => {
  const shift = (id: string, parts: [string, string, string][], updatedAt: string): DayShift & { id: string } => ({
    id,
    start: parts.length ? new Date(parts[0][1]) : null,
    updatedAt: new Date(updatedAt),
    segments: parts.map(([type, start, end]) => ({ type: { id: type }, start: new Date(start), end: new Date(end) })),
  });
  const publications = [period("2026-10-05", "2026-10-07")];
  const days = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08"];
  const publishedLayer = [
    shift("p5", [["shift", "2026-10-05T04:00Z", "2026-10-05T12:00Z"]], "2026-10-01T10:00Z"),
    shift("p6", [["shift", "2026-10-06T04:00Z", "2026-10-06T12:00Z"]], "2026-10-01T10:00Z"),
    // Over midnight: it belongs to the day it starts on.
    shift("p7", [["shift", "2026-10-07T19:00Z", "2026-10-08T03:00Z"]], "2026-10-01T10:00Z"),
  ];

  it("matches an unchanged day, and tells a changed one with the time of the change", () => {
    const actualLayer = [
      shift("a5", [["shift", "2026-10-05T04:00Z", "2026-10-05T12:00Z"]], "2026-10-01T10:00Z"),
      shift("a6", [["shift", "2026-10-06T06:00Z", "2026-10-06T14:00Z"]], "2026-10-04T05:30Z"),
      shift("a7", [["shift", "2026-10-07T19:00Z", "2026-10-08T03:00Z"]], "2026-10-01T10:00Z"),
    ];
    const roster = ownRosterDays(days, publications, publishedLayer, actualLayer);
    expect(roster.map((d) => [d.day, d.published, d.differs])).toEqual([
      ["2026-10-05", true, false],
      ["2026-10-06", true, true],
      ["2026-10-07", true, false],
      ["2026-10-08", false, false],
    ]);
    expect(roster[1].changedAt).toEqual(new Date("2026-10-04T05:30Z"));
    expect(roster[1].publishedShifts.map((s) => s.id)).toEqual(["p6"]);
    expect(roster[0].changedAt).toBeNull();
    expect(roster[2].actualShifts.map((s) => s.id)).toEqual(["a7"]);
  });

  it("shows nothing on a day not published yet", () => {
    const draftLike = [shift("x8", [["shift", "2026-10-08T04:00Z", "2026-10-08T12:00Z"]], "2026-10-01T10:00Z")];
    const day = ownRosterDays(["2026-10-08"], publications, draftLike, draftLike)[0];
    expect(day).toMatchObject({ published: false, publishedShifts: [], actualShifts: [], differs: false });
  });

  it("tells a removed actual shift without a time, and a new one with its own", () => {
    const removed = ownRosterDays(["2026-10-05"], publications, publishedLayer, [])[0];
    expect(removed).toMatchObject({ differs: true, changedAt: null, actualShifts: [] });
    const added = ownRosterDays(["2026-10-05"], publications, [], [shift("a5", [["shift", "2026-10-05T04:00Z", "2026-10-05T12:00Z"]], "2026-10-03T08:00Z")])[0];
    expect(added).toMatchObject({ differs: true, changedAt: new Date("2026-10-03T08:00Z") });
  });

  it("is free on a published day without a shift in either layer", () => {
    expect(ownRosterDays(["2026-10-05"], publications, [], [])[0]).toMatchObject({ published: true, differs: false, actualShifts: [] });
  });
});
