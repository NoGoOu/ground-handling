import { describe, expect, it } from "vitest";
import { DEMO_TEMPLATE_PARAMS } from "@/lib/demo-template";
import { showsOnDay } from "@/lib/flight-day";
import { NETLINE_MAPPING, netlineTable } from "@/lib/import/netline.fixture";
import { groundMinutes, pairLegs, planImport, type ImportedTurnaround } from "@/lib/import/pairing";
import type { Leg } from "@/lib/import/mapping";
import { localDayRange } from "@/lib/time";
import { turnaroundShape } from "@/lib/turnaround";

// The expected results of docs/schedule-import.md, "Tesztadat", on the sample
// file tests/fixtures/schedule/ryanair-netline-bud-sample.xlsx (times in UTC).

const plan = planImport(netlineTable(), NETLINE_MAPPING);

const utcTime = (date: Date) => date.toISOString().slice(11, 16);
const turnaroundsOf = (arrivalFlight: string | null, departureFlight: string | null) =>
  plan.turnarounds.filter(
    (t) => (t.arrival?.flightNumber ?? null) === arrivalFlight && (t.departure?.flightNumber ?? null) === departureFlight,
  );
const dates = (list: ImportedTurnaround[], part: "arrival" | "departure") => list.map((t) => t[part]!.flightDate);

describe("the sample file", () => {
  it("reads every row without an error, and leaves the two non-BUD rows out (rows 13, 14)", () => {
    expect(plan.rowErrors).toEqual([]);
    expect(plan.totalRows).toBe(14);
    expect(plan.filteredRows).toBe(2);
    const flights = plan.turnarounds.flatMap((t) => [t.arrival?.flightNumber, t.departure?.flightNumber]);
    expect(flights).not.toContain("FR428");
    expect(flights).not.toContain("FR7690");
  });

  it("pairs everything the table lists, and nothing more", () => {
    expect(plan.warnings).toEqual([]);
    const count = (kind: ImportedTurnaround["kind"]) => plan.turnarounds.filter((t) => t.kind === kind).length;
    expect(count("TURNAROUND")).toBe(7 + 3 + 14 + 3);
    expect(count("ARRIVAL_ONLY")).toBe(1);
    expect(count("DEPARTURE_ONLY")).toBe(14 + 8);
  });
});

describe("rows 1 + 4: quick turnaround", () => {
  const list = turnaroundsOf("FR9941", "FR9942");

  it("pairs FR9941 ALC→BUD with FR9942 BUD→ALC on every Tuesday from 09.10 to 10.22", () => {
    expect(dates(list, "arrival")).toEqual([
      "2024-09-10",
      "2024-09-17",
      "2024-09-24",
      "2024-10-01",
      "2024-10-08",
      "2024-10-15",
      "2024-10-22",
    ]);
    expect(dates(list, "departure")).toEqual(dates(list, "arrival"));
  });

  it("has STA 07:15, STD 07:40 and 25 minutes on the ground", () => {
    for (const t of list) {
      expect(utcTime(t.arrival!.sta)).toBe("07:15");
      expect(utcTime(t.departure!.std)).toBe("07:40");
      expect(groundMinutes(t)).toBe(25);
    }
  });
});

describe("rows 2 + 5: the aircraft stays overnight", () => {
  const list = turnaroundsOf("FR9941", "FR2515");

  it("pairs the Friday 20:55 arrival with the Saturday 15:00 FR2515, 09.13–09.28", () => {
    expect(dates(list, "arrival")).toEqual(["2024-09-13", "2024-09-20", "2024-09-27"]);
    expect(dates(list, "departure")).toEqual(["2024-09-14", "2024-09-21", "2024-09-28"]);
    for (const t of list) {
      expect(utcTime(t.arrival!.sta)).toBe("20:55");
      expect(utcTime(t.departure!.std)).toBe("15:00");
      expect(groundMinutes(t)).toBe(18 * 60 + 5);
    }
  });

  it("is a long turnaround and shows on both days", () => {
    const [first] = list;
    const lastArrival = new Date(+first.arrival!.sta + 10 * 60_000);
    const shape = turnaroundShape(DEMO_TEMPLATE_PARAMS, first.arrival!.sta, first.departure!.std, lastArrival);
    expect(shape.type).toBe("LONG");
    const anchors = { arrival: first.arrival!.sta, departure: first.departure!.std, order: first.arrival!.sta };
    expect(showsOnDay(anchors, localDayRange("2024-09-13"))).toBe(true);
    expect(showsOnDay(anchors, localDayRange("2024-09-14"))).toBe(true);
  });
});

describe("row 3: no next flight", () => {
  it("makes an arrival-only flight on 2025.01.07., STA 20:25", () => {
    const [t, ...rest] = turnaroundsOf("FR9941", null);
    expect(rest).toEqual([]);
    expect(t.kind).toBe("ARRIVAL_ONLY");
    expect(t.arrival!.flightDate).toBe("2025-01-07");
    expect(utcTime(t.arrival!.sta)).toBe("20:25");
  });
});

describe("rows 6 + 7 + 8: one arrival row, two departure rows", () => {
  const list = turnaroundsOf("FR4092", "FR4091");

  it("pairs every Tuesday and every Wednesday, STA 05:10, STD 05:35", () => {
    expect(list).toHaveLength(14);
    for (const t of list) {
      expect(t.departure!.flightDate).toBe(t.arrival!.flightDate);
      expect(utcTime(t.arrival!.sta)).toBe("05:10");
      expect(utcTime(t.departure!.std)).toBe("05:35");
    }
    const weekdays = new Set(list.map((t) => new Date(`${t.arrival!.flightDate}T12:00:00Z`).getUTCDay()));
    expect(weekdays).toEqual(new Set([2, 3]));
  });
});

describe("rows 9 + 10: quick turnaround", () => {
  it("pairs FR3111 PMI→BUD with FR4305 BUD→TSF on the Tuesdays 09.10–09.24", () => {
    const list = turnaroundsOf("FR3111", "FR4305");
    expect(dates(list, "arrival")).toEqual(["2024-09-10", "2024-09-17", "2024-09-24"]);
    for (const t of list) {
      expect(utcTime(t.arrival!.sta)).toBe("09:50");
      expect(utcTime(t.departure!.std)).toBe("10:15");
    }
  });
});

describe("row 11: nobody arrives for it", () => {
  it("makes departure-only flights on Tuesdays and Thursdays, STD 05:00", () => {
    const list = turnaroundsOf(null, "FR1659");
    expect(list).toHaveLength(14);
    for (const t of list) {
      expect(t.kind).toBe("DEPARTURE_ONLY");
      expect(utcTime(t.departure!.std)).toBe("05:00");
    }
  });
});

describe("row 12: DD = +1", () => {
  it("makes departure-only flights at 21:10; the next-day arrival elsewhere does not matter", () => {
    const list = turnaroundsOf(null, "FR1027");
    // The Wednesdays of 10.30–12.18.
    expect(dates(list, "departure")).toEqual([
      "2024-10-30",
      "2024-11-06",
      "2024-11-13",
      "2024-11-20",
      "2024-11-27",
      "2024-12-04",
      "2024-12-11",
      "2024-12-18",
    ]);
    for (const t of list) {
      expect(utcTime(t.departure!.std)).toBe("21:10");
      expect(t.departure!.destination).toBe("DUB");
    }
  });
});

describe("date range", () => {
  it("keeps the turnarounds of the range, paired across its edge", () => {
    // Only Saturday 09.14: the Friday arrival still pairs with it.
    const saturday = planImport(netlineTable(), NETLINE_MAPPING, { start: "2024-09-14", end: "2024-09-14" });
    const overnight = saturday.turnarounds.filter((t) => t.departure?.flightNumber === "FR2515");
    expect(overnight).toHaveLength(1);
    expect(overnight[0].arrival?.flightDate).toBe("2024-09-13");
  });
});

describe("pairing rules", () => {
  const leg = (overrides: Partial<Leg>): Leg => ({
    row: 1,
    airline: "FR",
    flightNumber: "FR1",
    origin: "ALC",
    destination: "BUD",
    flightDate: "2024-09-10",
    std: new Date("2024-09-10T04:00:00Z"),
    sta: new Date("2024-09-10T07:00:00Z"),
    aircraftType: null,
    aircraftConfig: null,
    next: null,
    ...overrides,
  });

  it("takes the first instance of the next flight that leaves after the arrival", () => {
    const arrival = leg({ next: "FR2" });
    const early = leg({ flightNumber: "FR2", origin: "BUD", destination: "ALC", std: new Date("2024-09-10T06:00:00Z") });
    const later = leg({ flightNumber: "FR2", origin: "BUD", destination: "ALC", flightDate: "2024-09-11", std: new Date("2024-09-11T06:00:00Z") });
    const { turnarounds } = pairLegs([arrival, early, later]);
    expect(turnarounds.find((t) => t.arrival)?.departure).toBe(later);
    expect(turnarounds.find((t) => !t.arrival)?.departure).toBe(early);
  });

  it("warns when the next flight is missing or already taken", () => {
    const first = leg({ next: "FR2" });
    const second = leg({ flightNumber: "FR3", sta: new Date("2024-09-10T07:30:00Z"), next: "FR2" });
    const departure = leg({ flightNumber: "FR2", origin: "BUD", destination: "ALC", std: new Date("2024-09-10T08:00:00Z") });
    const lonely = leg({ flightNumber: "FR5", sta: new Date("2024-09-10T09:00:00Z"), next: "FR9" });
    const { turnarounds, warnings } = pairLegs([first, second, departure, lonely]);
    expect(warnings.map((w) => w.kind)).toEqual(["nextTaken", "nextNotFound"]);
    expect(turnarounds.filter((t) => t.kind === "ARRIVAL_ONLY")).toHaveLength(2);
  });

  it("keeps the first of two rows for the same flight on the same day", () => {
    const { turnarounds, warnings } = pairLegs([leg({}), leg({ row: 2 })]);
    expect(turnarounds).toHaveLength(1);
    expect(warnings).toEqual([{ kind: "duplicate", leg: expect.objectContaining({ row: 2 }) }]);
  });
});
