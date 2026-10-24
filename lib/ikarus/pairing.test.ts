import { describe, expect, it } from "vitest";
import type { IkarusLeg } from "./merge";
import { pairByRegistration, pairingCounts } from "./pairing";

// Made-up legs (flight numbers QQ…, registrations XXQ…), see sample.fixture.ts.

let nextId = 900100;
function leg(direction: IkarusLeg["direction"], scheduled: string, registration: string | null, flightNumber = "QQ1"): IkarusLeg {
  const at = new Date(scheduled);
  return {
    direction,
    aodbId: nextId++,
    airline: flightNumber.slice(0, 2),
    flightNumber,
    route: "AAA",
    scheduled: at,
    estimated: null,
    actual: null,
    stand: null,
    registration,
    aircraftType: "320",
    firstSeen: at,
    lastSeen: at,
  };
}
const arrival = (scheduled: string, registration: string | null, flightNumber?: string) => leg("ARRIVAL", scheduled, registration, flightNumber);
const departure = (scheduled: string, registration: string | null, flightNumber?: string) => leg("DEPARTURE", scheduled, registration, flightNumber);

const pairs = (result: ReturnType<typeof pairByRegistration>) =>
  result.turnarounds.map((t) => [t.kind, t.arrival?.scheduled.toISOString().slice(11, 16) ?? null, t.departure?.scheduled.toISOString().slice(11, 16) ?? null]);

describe("turnarounds by registration", () => {
  it("pairs an arrival with the same aircraft's first departure after it", () => {
    const result = pairByRegistration([
      departure("2026-10-01T11:00:00Z", "XXQAA"),
      arrival("2026-10-01T10:00:00Z", "XXQAA"),
      departure("2026-10-01T10:50:00Z", "XXQAB"),
      arrival("2026-10-01T10:05:00Z", "XXQAB"),
    ]);
    expect(pairs(result)).toEqual([
      ["TURNAROUND", "10:00", "11:00"],
      ["TURNAROUND", "10:05", "10:50"],
    ]);
  });

  it("pairs within 24 hours, not beyond", () => {
    const within = pairByRegistration([arrival("2026-10-01T10:00:00Z", "XXQAA"), departure("2026-10-02T10:00:00Z", "XXQAA")]);
    expect(pairs(within)).toEqual([["TURNAROUND", "10:00", "10:00"]]);
    const beyond = pairByRegistration([arrival("2026-10-01T10:00:00Z", "XXQAA"), departure("2026-10-02T10:01:00Z", "XXQAA")]);
    expect(pairs(beyond)).toEqual([
      ["ARRIVAL_ONLY", "10:00", null],
      ["DEPARTURE_ONLY", null, "10:01"],
    ]);
    expect(beyond.unpaired).toEqual({ noRegistration: 0, noDeparture: 1 });
  });

  it("gives a departure to one arrival only", () => {
    // Two arrivals of the same registration (e.g. a typo upstream) and one departure.
    const result = pairByRegistration([
      arrival("2026-10-01T09:00:00Z", "XXQAA"),
      arrival("2026-10-01T09:30:00Z", "XXQAA"),
      departure("2026-10-01T10:30:00Z", "XXQAA"),
    ]);
    expect(pairingCounts(result.turnarounds)).toEqual({ TURNAROUND: 1, ARRIVAL_ONLY: 1, DEPARTURE_ONLY: 0 });
    expect(pairs(result)).toEqual([
      ["ARRIVAL_ONLY", "09:00", null],
      ["TURNAROUND", "09:30", "10:30"],
    ]);
  });

  it("does not take the departure of the aircraft's next turnaround when its own is missing", () => {
    const result = pairByRegistration([
      arrival("2026-10-01T08:00:00Z", "XXQAA"),
      // Its 08:45 departure is not in the backup.
      arrival("2026-10-01T13:00:00Z", "XXQAA"),
      departure("2026-10-01T13:45:00Z", "XXQAA"),
    ]);
    expect(pairs(result)).toEqual([
      ["ARRIVAL_ONLY", "08:00", null],
      ["TURNAROUND", "13:00", "13:45"],
    ]);
  });

  it("leaves flights without a registration one-sided", () => {
    const result = pairByRegistration([arrival("2026-10-01T10:00:00Z", null), departure("2026-10-01T11:00:00Z", null)]);
    expect(pairs(result)).toEqual([
      ["ARRIVAL_ONLY", "10:00", null],
      ["DEPARTURE_ONLY", null, "11:00"],
    ]);
    expect(result.unpaired).toEqual({ noRegistration: 1, noDeparture: 0 });
    expect(result.departuresWithoutRegistration).toBe(1);
  });

  it("pairs an aircraft staying overnight", () => {
    const result = pairByRegistration([
      arrival("2026-10-01T21:30:00Z", "XXQAA"),
      departure("2026-10-02T04:15:00Z", "XXQAA"),
      arrival("2026-10-02T09:00:00Z", "XXQAA"),
      departure("2026-10-02T09:50:00Z", "XXQAA"),
    ]);
    expect(pairs(result)).toEqual([
      ["TURNAROUND", "21:30", "04:15"],
      ["TURNAROUND", "09:00", "09:50"],
    ]);
  });

  it("keeps a departure before the aircraft's first arrival as departure-only", () => {
    const result = pairByRegistration([departure("2026-10-01T06:00:00Z", "XXQAA"), arrival("2026-10-01T09:00:00Z", "XXQAA"), departure("2026-10-01T09:45:00Z", "XXQAA")]);
    expect(pairs(result)).toEqual([
      ["DEPARTURE_ONLY", null, "06:00"],
      ["TURNAROUND", "09:00", "09:45"],
    ]);
  });

  it("gives a turnaround the arrival's airline, like the schedule import", () => {
    const result = pairByRegistration([arrival("2026-10-01T10:00:00Z", "XXQAA", "QQ1"), departure("2026-10-01T11:00:00Z", "XXQAA", "ZZ2")]);
    expect(result.turnarounds).toHaveLength(1);
    expect(result.turnarounds[0].airline).toBe("QQ");
  });
});
