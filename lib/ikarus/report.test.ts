import { describe, expect, it } from "vitest";
import { averages, coverageOf, isCompleteDay, reportCsv, reportText, type ReportDay } from "./report";
import { sampleRecord } from "./sample.fixture";
import type { Snapshot } from "./snapshot";

// Made-up snapshots and days, see sample.fixture.ts.

const at = (iso: string) => new Date(iso);
/** A snapshot whose arrivals and departures span the given scheduled times ("dd.mm.yyyy hh:mm", UTC). */
function snapshot(takenAt: string, first: string, last: string): Snapshot {
  const records = [sampleRecord({ scheduledTime: first }), sampleRecord({ id: 900002, scheduledTime: last })];
  return { takenAt: at(takenAt), arrivals: records, departures: records };
}

describe("coverage of the backup", () => {
  // Half-hourly snapshots, each seeing three hours back and nine ahead (Budapest is UTC+2 in October).
  const day = [
    snapshot("2026-10-01T19:00:00Z", "01.10.2026 16:00", "02.10.2026 04:00"),
    snapshot("2026-10-02T03:00:00Z", "02.10.2026 00:00", "02.10.2026 12:00"),
    snapshot("2026-10-02T11:00:00Z", "02.10.2026 08:00", "02.10.2026 20:00"),
    snapshot("2026-10-02T19:00:00Z", "02.10.2026 16:00", "03.10.2026 04:00"),
  ];

  it("joins the spans of the snapshots, and a day inside them is complete once it is over", () => {
    const coverage = coverageOf(day);
    expect(coverage.arrivals).toEqual([{ start: at("2026-10-01T16:00:00Z"), end: at("2026-10-03T04:00:00Z") }]);
    // 2 October is 1 Oct 22:00 – 2 Oct 22:00 UTC.
    expect(isCompleteDay("2026-10-02", coverage, at("2026-10-03T03:00:00Z"))).toBe(true);
    expect(isCompleteDay("2026-10-02", coverage, at("2026-10-02T19:00:00Z"))).toBe(false);
  });

  it("finds a gap: a day the backup did not see whole is not complete", () => {
    const gap = [day[0], day[1], day[3]];
    const coverage = coverageOf(gap);
    expect(coverage.departures).toHaveLength(2);
    expect(isCompleteDay("2026-10-02", coverage, at("2026-10-03T03:00:00Z"))).toBe(false);
  });

  it("leaves out records without a readable scheduled time", () => {
    const coverage = coverageOf([{ takenAt: at("2026-10-02T03:00:00Z"), arrivals: [{ scheduledTime: "x" }, null], departures: [] }]);
    expect(coverage).toEqual({ arrivals: [], departures: [] });
  });
});

function row(day: string, overrides: Partial<ReportDay> = {}): ReportDay {
  return {
    day,
    complete: true,
    flights: 100,
    quick: 60,
    long: 30,
    arrivalOnly: 5,
    departureOnly: 5,
    positions: 30,
    workMinutes: 30 * 480,
    peak: 12,
    peakAt: at(`${day}T05:15:00Z`),
    ...overrides,
  };
}

describe("the report", () => {
  // 2026-10-05 is a Monday, 2026-10-10 a Saturday.
  const rows = [
    row("2026-10-05"),
    row("2026-10-06", { flights: 140, positions: 40, peak: 16 }),
    row("2026-10-07", { complete: false, flights: 10, positions: 3 }),
    row("2026-10-10", { flights: 80, positions: 20, workMinutes: 20 * 450, peak: 9 }),
  ];

  it("averages the complete days, weekdays and weekend apart", () => {
    const { weekday, weekend } = averages(rows);
    expect(weekday).toEqual({ days: 2, flights: 120, positions: 35, workHours: (30 * 480 + 30 * 480) / 2 / 60, peak: 14 });
    expect(weekend).toEqual({ days: 1, flights: 80, positions: 20, workHours: 150, peak: 9 });
  });

  it("writes a CSV for a spreadsheet set to Hungarian: semicolons, decimal comma, local time", () => {
    const csv = reportCsv([row("2026-10-05", { workMinutes: 925 })]).split("\r\n");
    expect(csv[0]).toBe("nap;hét napja;teljes nap;járatok;gyors forduló;hosszú forduló;csak érkező;csak induló;pozíciók;munkaóra;létszámigény csúcsa;a csúcs ideje");
    expect(csv[1]).toBe("2026-10-05;hétfő;igen;100;60;30;5;5;30;15,4;12;07:15");
    expect(csv[2]).toBe("");
  });

  it("sums it up with the averages, the incomplete days and the settings", () => {
    const text = reportText(rows, { start: "2026-10-05", end: "2026-10-10" }, {
      planning: { minShiftMinutes: 240, maxShiftMinutes: 720, breakMinutes: 20, breakAfterMinutes: 360, restMinutes: 0, overlapMinutes: 0 },
      templates: [{ params: "25 / 5 / 15 / 40 / 15", tasks: 300 }],
    });
    expect(text).toContain("Időszak: 2026-10-05 – 2026-10-10, 4 nap, ebből teljes: 3");
    expect(text).toContain("Hiányos napok (a mentésben hézag van, vagy a nap még nem ért véget; az átlagokból kimaradnak): 2026-10-07");
    expect(text).toContain("Hétköznap (2 nap átlaga): 120,0 járat, 35,0 pozíció, 240,0 munkaóra, a létszámigény csúcsa 14,0");
    expect(text).toContain("Hétvége (1 nap átlaga): 80,0 járat, 20,0 pozíció, 150,0 munkaóra, a létszámigény csúcsa 9,0");
    expect(text).toContain("  25 / 5 / 15 / 40 / 15: 300 task");
  });
});
