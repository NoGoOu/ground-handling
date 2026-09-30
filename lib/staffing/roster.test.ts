import { describe, expect, it } from "vitest";
import { BAND_MINUTES, dayBands } from "@/lib/staffing/bands";
import { demandOfBands } from "@/lib/staffing/demand";
import {
  availableWindows,
  rosteredWithin,
  shortageOf,
  staffingOfBands,
  subtractWindows,
  surplusOf,
  type StaffSegment,
} from "@/lib/staffing/roster";
import { formatTime } from "@/lib/time";
import type { TimeWindow } from "@/lib/turnaround";

// The roster against the demand (CLAUDE.md, 9. mérföldkő, "Számítás"): the
// agents in an operative segment and not in a block, the fewest within the band.

/** Budapest is UTC+2 in September. */
const local = (hhmm: string, day = "2026-09-24") => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.parse(`${day}T00:00:00Z`) + ((h - 2) * 60 + m) * 60_000);
};
const window = (from: string, to: string): TimeWindow => ({ start: local(from), end: local(to) });
const band = (from: string): TimeWindow => ({ start: local(from), end: new Date(local(from).getTime() + BAND_MINUTES * 60_000) });
const times = (windows: TimeWindow[]) => windows.map((w) => `${formatTime(w.start)}–${formatTime(w.end)}`);

const shift = (userId: string, from: string, to: string): StaffSegment => ({
  userId,
  ...window(from, to),
  operative: true,
  createBlock: false,
  travelBeforeMinutes: 0,
  travelAfterMinutes: 0,
});
const training = (userId: string, from: string, to: string, rest: Partial<StaffSegment> = {}): StaffSegment => ({
  ...shift(userId, from, to),
  operative: false,
  createBlock: true,
  ...rest,
});

describe("windows minus cuts", () => {
  it("cuts a hole, an end, or nothing", () => {
    expect(times(subtractWindows([window("06:00", "14:00")], [window("08:00", "09:00")]))).toEqual(["06:00–08:00", "09:00–14:00"]);
    expect(times(subtractWindows([window("06:00", "14:00")], [window("05:00", "07:00"), window("13:00", "15:00")]))).toEqual([
      "07:00–13:00",
    ]);
    expect(times(subtractWindows([window("06:00", "14:00")], [window("14:00", "15:00")]))).toEqual(["06:00–14:00"]);
    expect(subtractWindows([window("06:00", "14:00")], [window("05:00", "15:00")])).toEqual([]);
  });
});

describe("when an agent is available", () => {
  it("is the operative segments, joined when they follow each other", () => {
    expect(times(availableWindows([shift("a", "06:00", "10:00"), shift("a", "10:00", "14:00")]))).toEqual(["06:00–14:00"]);
  });

  it("leaves out a non-operative segment, block or not", () => {
    const segments = [shift("a", "06:00", "10:00"), training("a", "10:00", "12:00", { createBlock: false }), shift("a", "12:00", "14:00")];
    expect(times(availableWindows(segments))).toEqual(["06:00–10:00", "12:00–14:00"]);
  });

  it("takes the travel time of a block out of the operative segments around it", () => {
    const segments = [
      shift("a", "06:00", "10:00"),
      training("a", "10:00", "12:00", { travelBeforeMinutes: 15, travelAfterMinutes: 20 }),
      shift("a", "12:00", "14:00"),
    ];
    expect(times(availableWindows(segments))).toEqual(["06:00–09:45", "12:20–14:00"]);
  });

  it("has no availability without an operative segment", () => {
    expect(availableWindows([training("a", "08:00", "12:00")])).toEqual([]);
  });
});

describe("the roster of a band", () => {
  it("counts the agents available through the whole band", () => {
    const availability = [[window("06:00", "14:00")], [window("08:00", "16:00")]];
    expect(rosteredWithin(band("07:45"), availability)).toBe(1);
    expect(rosteredWithin(band("08:00"), availability)).toBe(2);
    expect(rosteredWithin(band("13:45"), availability)).toBe(2);
    expect(rosteredWithin(band("14:00"), availability)).toBe(1);
    expect(rosteredWithin(band("16:00"), availability)).toBe(0);
  });

  it("does not count an agent who covers only a part of the band", () => {
    // Starts five minutes into the band, or leaves five minutes before its end.
    expect(rosteredWithin(band("08:00"), [[window("08:05", "16:00")]])).toBe(0);
    expect(rosteredWithin(band("08:00"), [[window("06:00", "08:10")]])).toBe(0);
    expect(rosteredWithin(band("08:00"), [[window("06:00", "08:15")]])).toBe(1);
  });

  it("does not count an agent with a block in the middle of the band", () => {
    const agent = availableWindows([shift("a", "06:00", "14:00"), training("a", "08:05", "08:10")]);
    expect(rosteredWithin(band("07:45"), [agent])).toBe(1);
    expect(rosteredWithin(band("08:00"), [agent])).toBe(0);
    expect(rosteredWithin(band("08:15"), [agent])).toBe(1);
  });

  it("takes the fewest at once: two agents who relieve each other with a gap are not one", () => {
    // One leaves at 08:05, the other arrives at 08:10.
    expect(rosteredWithin(band("08:00"), [[window("06:00", "08:05")], [window("08:10", "16:00")]])).toBe(0);
    // A handover without a gap keeps one through the band.
    expect(rosteredWithin(band("08:00"), [[window("06:00", "08:05")], [window("08:05", "16:00")]])).toBe(1);
  });
});

describe("demand against the roster", () => {
  const demand = (day: string) =>
    demandOfBands(
      dayBands(day),
      [
        { ...window("08:00", "08:45"), taskType: "GOU" },
        { ...window("08:20", "09:00"), taskType: "GOU" },
        { ...window("08:30", "08:40"), taskType: "HDS" },
      ],
      ["GOU", "HDS"],
    );
  const at = (rows: ReturnType<typeof staffingOfBands>, hhmm: string) => rows.find((row) => formatTime(row.start) === hhmm)!;

  it("gives the shortage and the surplus of each band from the total demand", () => {
    const rows = staffingOfBands(demand("2026-09-24"), [shift("a", "06:00", "14:00"), shift("b", "08:30", "16:00")]);
    expect(at(rows, "07:45")).toMatchObject({ total: 0, rostered: 1, balance: 1 });
    expect(at(rows, "08:00")).toMatchObject({ total: 1, rostered: 1, balance: 0 });
    expect(at(rows, "08:15")).toMatchObject({ total: 2, rostered: 1, balance: -1 });
    expect(at(rows, "08:30")).toMatchObject({ total: 3, rostered: 2, balance: -1 });
    expect(at(rows, "08:45")).toMatchObject({ total: 1, rostered: 2, balance: 1 });
    expect(shortageOf(at(rows, "08:15"))).toBe(1);
    expect(surplusOf(at(rows, "08:15"))).toBe(0);
    expect(surplusOf(at(rows, "08:45"))).toBe(1);
    expect(shortageOf(at(rows, "08:45"))).toBe(0);
  });

  it("counts an agent once, however many segments they have", () => {
    const rows = staffingOfBands(demand("2026-09-24"), [shift("a", "06:00", "10:00"), shift("a", "10:00", "14:00")]);
    expect(at(rows, "09:45")).toMatchObject({ rostered: 1 });
    expect(at(rows, "10:00")).toMatchObject({ rostered: 1 });
  });

  it("counts a shift over midnight on both days", () => {
    // 22:00 to 06:00 the next morning.
    const night: StaffSegment = { ...shift("a", "22:00", "23:00"), end: local("30:00") };
    const first = staffingOfBands(demand("2026-09-24"), [night]);
    expect(first.filter((row) => row.rostered > 0).map((row) => formatTime(row.start))).toEqual([
      "22:00", "22:15", "22:30", "22:45", "23:00", "23:15", "23:30", "23:45",
    ]);
    const second = staffingOfBands(demandOfBands(dayBands("2026-09-25"), [], []), [night]);
    const covered = second.filter((row) => row.rostered > 0).map((row) => formatTime(row.start));
    expect(covered).toHaveLength(24);
    expect([covered[0], covered.at(-1)]).toEqual(["00:00", "05:45"]);
  });

  it("shows the whole demand as shortage without a roster", () => {
    const rows = staffingOfBands(demand("2026-09-24"), []);
    expect(at(rows, "08:30")).toMatchObject({ total: 3, rostered: 0, balance: -3 });
    expect(at(rows, "12:00")).toMatchObject({ total: 0, rostered: 0, balance: 0 });
  });
});
