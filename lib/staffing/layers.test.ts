import { describe, expect, it } from "vitest";
import { staffingDay } from "@/lib/staffing/day";
import type { DemandWindow } from "@/lib/staffing/demand";
import { dayRosterLayer, rosterSegments, type RosterSource, type StaffShift } from "@/lib/staffing/layers";
import { isShort, summaryOf } from "@/lib/staffing/summary";
import { formatTime } from "@/lib/time";

// The draft in the staffing demand (CLAUDE.md, 9. mérföldkő, utómunka): on a
// day not yet published the draft gives the roster, for whoever may see it.

/** Budapest is UTC+2 in September; hours past 24 run into the next day. */
const local = (hhmm: string, day: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.parse(`${day}T00:00:00Z`) + ((h - 2) * 60 + m) * 60_000);
};

const PUBLISHED = new Set(["2026-09-24"]);
const isPublishedDay = (day: string) => PUBLISHED.has(day);

function shift(userId: string, layer: RosterSource, day: string, from: string, to: string): StaffShift {
  const start = local(from, day);
  return {
    userId,
    layer,
    start,
    segments: [{ start, end: local(to, day), operative: true, createBlock: false, travelBeforeMinutes: 0, travelAfterMinutes: 0 }],
  };
}
const demand = (day: string, from: string, to: string): DemandWindow => ({ start: local(from, day), end: local(to, day), taskType: "GOU" });

/** One day as a viewer sees it. */
function view(day: string, shifts: StaffShift[], windows: DemandWindow[], canSeeDraft: boolean) {
  return staffingDay(day, windows, rosterSegments(shifts, isPublishedDay, canSeeDraft), dayRosterLayer(isPublishedDay(day), canSeeDraft));
}
const at = (day: ReturnType<typeof view>, hhmm: string) => day.bands.find((band) => formatTime(band.start) === hhmm)!;

describe("the layer of a day's roster", () => {
  it("is the actual one on a published day, for everyone", () => {
    expect(dayRosterLayer(true, true)).toBe("ACTUAL");
    expect(dayRosterLayer(true, false)).toBe("ACTUAL");
  });

  it("is the draft on a day not yet published, for whoever may see the draft; nothing for the others", () => {
    expect(dayRosterLayer(false, true)).toBe("DRAFT");
    expect(dayRosterLayer(false, false)).toBeNull();
  });
});

describe("the shifts that count", () => {
  const shifts = [
    shift("a", "ACTUAL", "2026-09-24", "06:00", "14:00"),
    shift("b", "DRAFT", "2026-09-25", "06:00", "14:00"),
    // A shift lead's actual shift on a day not yet published, and a planner's draft on a published one.
    shift("c", "ACTUAL", "2026-09-25", "06:00", "14:00"),
    shift("d", "DRAFT", "2026-09-24", "06:00", "14:00"),
  ];

  it("take each shift by the layer of the day it starts on", () => {
    expect(rosterSegments(shifts, isPublishedDay, true).map((s) => [s.userId, s.layer])).toEqual([
      ["a", "ACTUAL"],
      ["b", "DRAFT"],
    ]);
  });

  it("leave the draft out for whoever may not see it", () => {
    expect(rosterSegments(shifts, isPublishedDay, false).map((s) => s.userId)).toEqual(["a"]);
  });
});

describe("a day not yet published", () => {
  const day = "2026-09-25";
  const windows = [demand(day, "08:00", "08:45"), demand(day, "08:20", "09:00")];
  const shifts = [shift("b", "DRAFT", day, "06:00", "14:00"), shift("c", "ACTUAL", day, "06:00", "14:00")];

  it("sets the demand against the draft, with shortage and surplus as on a published day", () => {
    const planner = view(day, shifts, windows, true);
    expect(planner).toMatchObject({ rosterLayer: "DRAFT", hasRoster: true });
    expect(at(planner, "08:00")).toMatchObject({ total: 1, rostered: 1, balance: 0 });
    expect(at(planner, "08:15")).toMatchObject({ total: 2, rostered: 1, balance: -1 });
    expect(isShort(planner, at(planner, "08:15"))).toBe(true);
    expect(at(planner, "12:00")).toMatchObject({ rostered: 1, balance: 1 });
    expect(summaryOf(planner)).toMatchObject({ shortage: 1, shortBands: 2 });
  });

  it("shows only the demand to whoever may not see the draft, even with an actual shift on the day", () => {
    const lead = view(day, shifts, windows, false);
    expect(lead).toMatchObject({ rosterLayer: null, hasRoster: false });
    expect(at(lead, "08:15")).toMatchObject({ total: 2, rostered: 0 });
    expect(lead.bands.some((band) => isShort(lead, band))).toBe(false);
    expect(summaryOf(lead)).toMatchObject({ peak: 2, shortage: 0, shortBands: 0 });
  });

  it("marks no shortage without a draft on the day", () => {
    const planner = view(day, [], windows, true);
    expect(planner).toMatchObject({ rosterLayer: "DRAFT", hasRoster: false });
    expect(summaryOf(planner).shortBands).toBe(0);
  });
});

describe("a shift over midnight between a published day and one not yet published", () => {
  it("counts the actual night shift of the published day on the next morning, without making that day short", () => {
    // 22:00 on the published 24th to 06:00 on the 25th, which has no draft yet.
    const night = [shift("a", "ACTUAL", "2026-09-24", "22:00", "30:00")];
    const windows = [demand("2026-09-25", "05:00", "05:30"), demand("2026-09-25", "10:00", "10:30")];
    const planner = view("2026-09-25", night, windows, true);
    expect(at(planner, "05:00")).toMatchObject({ total: 1, rostered: 1, balance: 0 });
    expect(at(planner, "10:00")).toMatchObject({ total: 1, rostered: 0 });
    // The draft of the day is empty, so nothing is marked short.
    expect(planner.hasRoster).toBe(false);
    expect(summaryOf(planner).shortBands).toBe(0);
    // Whoever may not see the draft sees only the demand of the 25th.
    const lead = view("2026-09-25", night, windows, false);
    expect(at(lead, "05:00")).toMatchObject({ total: 1, rostered: 0 });
    // On the published 24th itself the night shift is the actual roster.
    expect(view("2026-09-24", night, [], false)).toMatchObject({ rosterLayer: "ACTUAL", hasRoster: true });
  });

  it("counts the draft night shift of the day before on a published morning, for whoever may see the draft", () => {
    // 22:00 on the 23rd, not yet published, to 06:00 on the published 24th.
    const night = [shift("b", "DRAFT", "2026-09-23", "22:00", "30:00"), shift("a", "ACTUAL", "2026-09-24", "06:00", "14:00")];
    const windows = [demand("2026-09-24", "05:00", "05:30")];
    const planner = view("2026-09-24", night, windows, true);
    expect(planner).toMatchObject({ rosterLayer: "ACTUAL", hasRoster: true });
    expect(at(planner, "05:00")).toMatchObject({ total: 1, rostered: 1, balance: 0 });
    const lead = view("2026-09-24", night, windows, false);
    expect(at(lead, "05:00")).toMatchObject({ total: 1, rostered: 0, balance: -1 });
  });
});
