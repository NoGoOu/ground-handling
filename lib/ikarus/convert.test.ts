import { describe, expect, it } from "vitest";
import { liveChanges, liveData, planIkarus, toLeg, withoutDuplicates, type LiveState } from "./convert";
import type { IkarusLeg } from "./merge";
import type { IkarusTurnaround } from "./pairing";

// Made-up legs (QQ…, XXQ…, AAA), see sample.fixture.ts.

const at = (iso: string) => new Date(iso);
let nextId = 900200;
function leg(direction: IkarusLeg["direction"], scheduled: string, overrides: Partial<IkarusLeg> = {}): IkarusLeg {
  return {
    direction,
    aodbId: nextId++,
    airline: "QQ",
    flightNumber: direction === "ARRIVAL" ? "QQ1" : "QQ2",
    route: "AAA",
    scheduled: at(scheduled),
    estimated: null,
    actual: null,
    stand: null,
    registration: "XXQAA",
    aircraftType: "320",
    firstSeen: at(scheduled),
    lastSeen: at(scheduled),
    ...overrides,
  };
}
const turnaround = (arrival: IkarusLeg | null, departure: IkarusLeg | null): IkarusTurnaround => ({
  kind: arrival && departure ? "TURNAROUND" : arrival ? "ARRIVAL_ONLY" : "DEPARTURE_ONLY",
  airline: "QQ",
  arrival,
  departure,
});

const nothing: LiveState = {
  stand: null,
  eta: null,
  etaSource: null,
  etaRecordedAt: null,
  etd: null,
  etdSource: null,
  etdRecordedAt: null,
  ata: null,
  atd: null,
  arrivalAodbId: null,
  departureAodbId: null,
  arrivalActualFromMessage: false,
  departureActualFromMessage: false,
};

describe("the legs for the schedule import", () => {
  it("puts Budapest at the right end and takes the Budapest day as the operating day", () => {
    const late = toLeg(leg("ARRIVAL", "2026-10-01T22:30:00Z", { aodbId: 5 }));
    expect(late).toMatchObject({ origin: "AAA", destination: "BUD", flightDate: "2026-10-02", sta: at("2026-10-01T22:30:00Z"), aodbId: 5 });
    expect(toLeg(leg("DEPARTURE", "2026-10-01T05:00:00Z"))).toMatchObject({ origin: "BUD", destination: "AAA", flightDate: "2026-10-01", std: at("2026-10-01T05:00:00Z") });
  });

  it("keeps the last seen of the same flight under two AODB ids", () => {
    const first = leg("DEPARTURE", "2026-10-01T09:00:00Z", { aodbId: 10, lastSeen: at("2026-10-01T06:00:00Z") });
    const second = leg("DEPARTURE", "2026-10-01T09:30:00Z", { aodbId: 11, lastSeen: at("2026-10-01T09:40:00Z") });
    const otherRoute = leg("DEPARTURE", "2026-10-01T15:00:00Z", { aodbId: 12, route: "BBB" });
    const result = withoutDuplicates([first, second, otherRoute]);
    expect(result.duplicates).toBe(1);
    expect(result.legs.map((l) => l.aodbId)).toEqual([11, 12]);
  });

  it("keeps the turnarounds touching the range, paired across its edge", () => {
    const plan = planIkarus(
      [
        leg("ARRIVAL", "2026-10-01T20:30:00Z", { registration: "XXQAA" }),
        leg("DEPARTURE", "2026-10-02T04:00:00Z", { registration: "XXQAA" }),
        leg("ARRIVAL", "2026-10-03T10:00:00Z", { registration: "XXQAB" }),
      ],
      { start: "2026-10-02", end: "2026-10-02" },
    );
    expect(plan.turnarounds).toHaveLength(1);
    expect(plan.turnarounds[0].imported.kind).toBe("TURNAROUND");
    expect(plan.turnarounds[0].imported.arrival?.sta).toEqual(at("2026-10-01T20:30:00Z"));
  });
});

describe("the fields Ikarus writes besides the schedule", () => {
  const arrival = leg("ARRIVAL", "2026-10-01T10:00:00Z", {
    aodbId: 21,
    estimated: at("2026-10-01T10:20:00Z"),
    actual: at("2026-10-01T10:18:00Z"),
    stand: "12",
    lastSeen: at("2026-10-01T10:41:00Z"),
  });
  const departure = leg("DEPARTURE", "2026-10-01T11:00:00Z", { aodbId: 22, estimated: at("2026-10-01T11:25:00Z"), stand: "14", lastSeen: at("2026-10-01T10:41:00Z") });

  it("gives a new flight everything the backup has, the stand of the departure", () => {
    expect(liveData(turnaround(arrival, departure), null)).toEqual({
      arrivalAodbId: 21,
      departureAodbId: 22,
      stand: "14",
      eta: at("2026-10-01T10:20:00Z"),
      etaSource: "IKARUS",
      etaNote: null,
      etaRecordedById: null,
      etaRecordedAt: at("2026-10-01T10:41:00Z"),
      ata: at("2026-10-01T10:18:00Z"),
      etd: at("2026-10-01T11:25:00Z"),
      etdSource: "IKARUS",
      etdNote: null,
      etdRecordedById: null,
      etdRecordedAt: at("2026-10-01T10:41:00Z"),
    });
  });

  it("does not overwrite a later estimate given by hand, but an earlier one", () => {
    const later = { ...nothing, eta: at("2026-10-01T10:45:00Z"), etaSource: "MANUAL" as const, etaRecordedAt: at("2026-10-01T10:50:00Z") };
    expect(liveData(turnaround(arrival, null), later)).not.toHaveProperty("eta");
    const earlier = { ...later, etaRecordedAt: at("2026-10-01T09:00:00Z") };
    expect(liveData(turnaround(arrival, null), earlier)).toMatchObject({ eta: at("2026-10-01T10:20:00Z"), etaSource: "IKARUS" });
  });

  it("takes an estimate away that came from Ikarus when the backup has none any more, but not one given by hand", () => {
    const without = { ...arrival, estimated: null };
    const fromIkarus = { ...nothing, eta: at("2026-10-01T10:20:00Z"), etaSource: "IKARUS" as const, etaRecordedAt: at("2026-10-01T09:41:00Z") };
    expect(liveData(turnaround(without, null), fromIkarus)).toMatchObject({ eta: null, etaSource: null, etaRecordedAt: null });
    const byHand = { ...fromIkarus, etaSource: "MANUAL" as const };
    expect(liveData(turnaround(without, null), byHand)).not.toHaveProperty("eta");
  });

  it("keeps an actual time a message gave, and a stand when the backup has none", () => {
    const current = { ...nothing, ata: at("2026-10-01T10:16:00Z"), arrivalActualFromMessage: true, stand: "9" };
    const data = liveData(turnaround({ ...arrival, stand: null }, null), current);
    expect(data).not.toHaveProperty("ata");
    expect(data).not.toHaveProperty("stand");
  });

  it("names the fields that change, and none when nothing does", () => {
    const data = liveData(turnaround(arrival, null), null);
    const current: LiveState = {
      ...nothing,
      stand: "12",
      eta: at("2026-10-01T10:20:00Z"),
      etaSource: "IKARUS",
      etaRecordedAt: at("2026-10-01T10:41:00Z"),
      ata: at("2026-10-01T10:18:00Z"),
      arrivalAodbId: 21,
    };
    expect(liveChanges(liveData(turnaround(arrival, null), current), current)).toEqual([]);
    expect(liveChanges(data, { ...current, stand: "11", arrivalAodbId: null })).toEqual(["arrivalAodbId", "stand"]);
  });
});
