import { describe, expect, it } from "vitest";
import { DEMO_MILESTONES, DEMO_TEMPLATE_PARAMS } from "@/lib/demo-template";
import { BAND_MINUTES, dayBands } from "@/lib/staffing/bands";
import { demandOfBands, demandWindows, peakWithin, taskTypesOf, type DemandTask, type DemandWindow } from "@/lib/staffing/demand";
import { formatTime } from "@/lib/time";
import { computeTimeline, type FlightTimes, type MilestoneDef, type TimeWindow } from "@/lib/turnaround";

// The staffing demand (CLAUDE.md, 9. mérföldkő, "Számítás"): 15-minute bands
// of the Budapest day, and in each the most occupancy windows running at once.

/** Budapest is UTC+2 in September: 08:00 local is 06:00 UTC. */
const utc = (iso: string) => new Date(`${iso}:00Z`);
const local = (hhmm: string, day = "2026-09-24") => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.parse(`${day}T00:00:00Z`) + ((h - 2) * 60 + m) * 60_000);
};
const window = (from: string, to: string, day?: string): TimeWindow => ({ start: local(from, day), end: local(to, day) });
const band = (from: string): TimeWindow => ({ start: local(from), end: new Date(local(from).getTime() + BAND_MINUTES * 60_000) });

describe("the bands of a day", () => {
  it("cuts a day into 96 bands of 15 minutes from local midnight", () => {
    const bands = dayBands("2026-09-24");
    expect(bands).toHaveLength(96);
    expect(bands[0]).toEqual({ start: utc("2026-09-23T22:00"), end: utc("2026-09-23T22:15") });
    expect(bands[95]).toEqual({ start: utc("2026-09-24T21:45"), end: utc("2026-09-24T22:00") });
    expect(formatTime(bands[32].start)).toBe("08:00");
  });

  it("leaves no gap between the bands, nor between two days", () => {
    const bands = [...dayBands("2026-09-24"), ...dayBands("2026-09-25")];
    for (let i = 1; i < bands.length; i++) expect(bands[i].start).toEqual(bands[i - 1].end);
  });

  it("follows real time when the clocks go forward: 92 bands, none between 02:00 and 03:00", () => {
    const bands = dayBands("2026-03-29");
    expect(bands).toHaveLength(92);
    const labels = bands.map((b) => formatTime(b.start));
    expect(labels.slice(6, 10)).toEqual(["01:30", "01:45", "03:00", "03:15"]);
    expect(labels.filter((label) => label.startsWith("02:"))).toEqual([]);
    expect(labels.at(-1)).toBe("23:45");
  });

  it("follows real time when the clocks go back: 100 bands, 02:00 to 03:00 twice", () => {
    const bands = dayBands("2026-10-25");
    expect(bands).toHaveLength(100);
    const labels = bands.map((b) => formatTime(b.start));
    expect(labels.slice(8, 16)).toEqual(["02:00", "02:15", "02:30", "02:45", "02:00", "02:15", "02:30", "02:45"]);
    expect(labels.at(-1)).toBe("23:45");
  });
});

describe("the peak within a band", () => {
  it("is zero without windows", () => {
    expect(peakWithin(band("08:00"), [])).toBe(0);
  });

  it("does not count a window that ends at the start of the band or starts at its end", () => {
    expect(peakWithin(band("08:00"), [window("07:30", "08:00")])).toBe(0);
    expect(peakWithin(band("08:00"), [window("08:15", "09:00")])).toBe(0);
    // One minute into the band on either side, and it counts.
    expect(peakWithin(band("08:00"), [window("07:30", "08:01")])).toBe(1);
    expect(peakWithin(band("08:00"), [window("08:14", "09:00")])).toBe(1);
  });

  it("counts a window of one minute in the middle of the band", () => {
    expect(peakWithin(band("08:00"), [window("08:07", "08:08")])).toBe(1);
  });

  it("counts a window that covers the band and more", () => {
    expect(peakWithin(band("08:00"), [window("06:00", "12:00")])).toBe(1);
  });

  it("takes the most at once, not everything the band touches", () => {
    // Two after each other within the band: one agent is enough.
    expect(peakWithin(band("08:00"), [window("07:50", "08:05"), window("08:05", "08:30")])).toBe(1);
    // One minute together: two are needed.
    expect(peakWithin(band("08:00"), [window("07:50", "08:06"), window("08:05", "08:30")])).toBe(2);
    // Three touch the band, but never more than two at once.
    expect(
      peakWithin(band("08:00"), [window("07:50", "08:04"), window("08:02", "08:10"), window("08:08", "08:30")]),
    ).toBe(2);
  });

  it("finds a peak that starts and ends inside the band", () => {
    const windows = [window("07:00", "09:00"), window("08:03", "08:06"), window("08:04", "08:05")];
    expect(peakWithin(band("08:00"), windows)).toBe(3);
    expect(peakWithin(band("08:15"), windows)).toBe(1);
  });
});

describe("the demand of a day", () => {
  const types = ["GOU", "HDS"];
  const demand = (windows: DemandWindow[], day = "2026-09-24") => demandOfBands(dayBands(day), windows, types);
  const at = (rows: ReturnType<typeof demand>, hhmm: string) => rows.filter((row) => formatTime(row.start) === hhmm);

  it("gives every band its peak per task type and in total", () => {
    const rows = demand([
      { ...window("08:00", "08:45"), taskType: "GOU" },
      { ...window("08:20", "09:00"), taskType: "GOU" },
      { ...window("08:30", "08:40"), taskType: "HDS" },
    ]);
    expect(at(rows, "07:45")[0]).toMatchObject({ total: 0, byType: { GOU: 0, HDS: 0 } });
    expect(at(rows, "08:00")[0]).toMatchObject({ total: 1, byType: { GOU: 1, HDS: 0 } });
    expect(at(rows, "08:15")[0]).toMatchObject({ total: 2, byType: { GOU: 2, HDS: 0 } });
    expect(at(rows, "08:30")[0]).toMatchObject({ total: 3, byType: { GOU: 2, HDS: 1 } });
    expect(at(rows, "08:45")[0]).toMatchObject({ total: 1, byType: { GOU: 1, HDS: 0 } });
    expect(at(rows, "09:00")[0]).toMatchObject({ total: 0, byType: { GOU: 0, HDS: 0 } });
  });

  it("counts the total from all windows together: it is not the sum of the task types", () => {
    // In one band, but after each other: each type peaks at 1, and so does the total.
    const rows = demand([
      { ...window("08:00", "08:05"), taskType: "GOU" },
      { ...window("08:10", "08:14"), taskType: "HDS" },
    ]);
    expect(at(rows, "08:00")[0]).toMatchObject({ total: 1, byType: { GOU: 1, HDS: 1 } });
  });

  it("counts a window over midnight in the bands of both days", () => {
    // A quick turnaround at 23:55: occupied 23:50–00:35.
    const night = [{ ...window("23:50", "24:35"), taskType: "GOU" }];
    const first = demand(night, "2026-09-24");
    expect(first.filter((row) => row.total > 0).map((row) => formatTime(row.start))).toEqual(["23:45"]);
    const second = demand(night, "2026-09-25");
    expect(second.filter((row) => row.total > 0).map((row) => formatTime(row.start))).toEqual(["00:00", "00:15", "00:30"]);
  });

  it("follows real time on the day the clocks go forward", () => {
    // 01:30–03:30 local is one hour of real time: 00:30–01:30 UTC.
    const rows = demand([{ start: utc("2026-03-29T00:30"), end: utc("2026-03-29T01:30"), taskType: "GOU" }], "2026-03-29");
    expect(rows).toHaveLength(92);
    expect(rows.filter((row) => row.total > 0).map((row) => formatTime(row.start))).toEqual(["01:30", "01:45", "03:00", "03:15"]);
  });

  it("counts the repeated hour twice on the day the clocks go back", () => {
    // Two hours of real time from 02:00 summer time: 00:00–02:00 UTC.
    const rows = demand([{ start: utc("2026-10-25T00:00"), end: utc("2026-10-25T02:00"), taskType: "GOU" }], "2026-10-25");
    expect(rows).toHaveLength(100);
    expect(rows.filter((row) => row.total > 0).map((row) => formatTime(row.start))).toEqual([
      "02:00", "02:15", "02:30", "02:45", "02:00", "02:15", "02:30", "02:45",
    ]);
  });

  it("lists the task types that have work in the bands", () => {
    const windows = [
      { ...window("08:00", "08:45"), taskType: "HDS" },
      { ...window("09:00", "09:45"), taskType: "GOU" },
      { ...window("09:00", "09:45", "2026-09-26"), taskType: "XYZ" },
    ];
    expect(taskTypesOf(dayBands("2026-09-24"), windows)).toEqual(["GOU", "HDS"]);
    expect(taskTypesOf(dayBands("2026-09-25"), windows)).toEqual([]);
  });
});

describe("the windows the demand counts", () => {
  const milestones: MilestoneDef[] = DEMO_MILESTONES.map((m) => ({ ...m, id: m.code }));
  const task = (taskType: string, flight: FlightTimes): DemandTask => ({
    taskType,
    windows: computeTimeline({ flight, params: DEMO_TEMPLATE_PARAMS, milestones, recorded: new Map() }).shape.windows,
  });
  const peakAt = (tasks: DemandTask[], hhmm: string) => peakWithin(band(hhmm), demandWindows(tasks));

  it("takes one window of a quick turnaround and two of a long one", () => {
    const quick = task("GOU", { sta: local("08:00"), std: local("08:25") });
    const long = task("GOU", { sta: local("08:00"), std: local("11:00") });
    expect(demandWindows([quick])).toEqual([{ start: local("07:55"), end: local("08:40"), taskType: "GOU" }]);
    expect(demandWindows([long]).map((w) => [formatTime(w.start), formatTime(w.end)])).toEqual([
      ["07:55", "08:15"],
      ["10:15", "11:15"],
    ]);
    // In the break of the long turnaround nobody is needed.
    expect(peakAt([long], "09:00")).toBe(0);
  });

  it("leaves a cancelled part out", () => {
    const flight = { sta: local("08:00"), std: local("11:00") };
    expect(peakAt([task("GOU", flight)], "08:00")).toBe(1);
    const cancelled = task("GOU", { ...flight, arrivalCancelled: true });
    expect(peakAt([cancelled], "08:00")).toBe(0);
    expect(peakAt([cancelled], "10:30")).toBe(1);
    // Both parts cancelled: the flight asks for nobody.
    expect(demandWindows([task("GOU", { ...flight, arrivalCancelled: true, departureCancelled: true })])).toEqual([]);
  });

  it("leaves out a task with nothing to do", () => {
    expect(demandWindows([{ taskType: "HDS", windows: [] }])).toEqual([]);
  });

  it("moves with the delay: the effective times give the windows", () => {
    const late = task("GOU", { sta: local("08:00"), eta: local("09:00"), std: local("08:25") });
    expect(peakAt([late], "08:00")).toBe(0);
    expect(peakAt([late], "09:00")).toBe(1);
  });
});
