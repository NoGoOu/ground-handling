import { describe, expect, it } from "vitest";
import { diffImport, type ExistingFlight } from "@/lib/import/diff";
import type { Leg } from "@/lib/import/mapping";
import type { ImportedTurnaround } from "@/lib/import/pairing";

// The Ikarus import finds a leg by its AODB id before the flight number
// (CLAUDE.md, "Közbeiktatva: valós járatok az Ikarus-mentésből"). Made-up
// flights (QQ…, airports AAA/BBB/CCC).

const QQ = { id: "qq", code: "QQ", defaultTemplateId: "tpl" };

function leg(aodbId: number, flightNumber: string, origin: string, destination: string, time: string): Leg {
  const at = new Date(time);
  return {
    row: 0,
    airline: "QQ",
    flightNumber,
    origin,
    destination,
    flightDate: time.slice(0, 10),
    std: at,
    sta: at,
    aircraftType: "320",
    aircraftConfig: null,
    registration: "XXQAA",
    next: null,
    aodbId,
  };
}

const turnaround = (arrival: Leg | null, departure: Leg | null): ImportedTurnaround => ({
  kind: arrival && departure ? "TURNAROUND" : arrival ? "ARRIVAL_ONLY" : "DEPARTURE_ONLY",
  airline: "QQ",
  arrival,
  departure,
});

function saved(t: ImportedTurnaround, id: string): ExistingFlight {
  return {
    id,
    airline: "QQ",
    inboundFlightNumber: t.arrival?.flightNumber ?? null,
    outboundFlightNumber: t.departure?.flightNumber ?? null,
    arrivalFlightDate: t.arrival?.flightDate ?? null,
    departureFlightDate: t.departure?.flightDate ?? null,
    origin: t.arrival?.origin ?? null,
    destination: t.departure?.destination ?? null,
    sta: t.arrival?.sta ?? null,
    std: t.departure?.std ?? null,
    aircraftType: "320",
    aircraftConfig: null,
    arrivalRegistration: "XXQAA",
    departureRegistration: "XXQAA",
    importProfileId: "ikarus",
    source: "IMPORT",
    operational: false,
    arrivalAodbId: t.arrival?.aodbId ?? null,
    departureAodbId: t.departure?.aodbId ?? null,
  };
}

const a1 = leg(1, "QQ1", "AAA", "BUD", "2026-10-01T08:00:00Z");
const d1 = leg(2, "QQ2", "BUD", "BBB", "2026-10-01T09:00:00Z");

describe("legs found by their AODB id", () => {
  it("finds a flight whose route changed, and reports the change", () => {
    const existing = [saved(turnaround(a1, d1), "f1")];
    const diverted = leg(2, "QQ2", "BUD", "CCC", "2026-10-01T09:00:00Z");
    const diff = diffImport({ plan: { turnarounds: [turnaround(a1, diverted)] }, existing, airlines: [QQ], profileId: "ikarus", period: null });
    expect(diff.entries).toHaveLength(1);
    expect(diff.entries[0]).toMatchObject({ kind: "changed", flightId: "f1", repair: false, changes: [{ field: "destination", from: "BBB", to: "CCC" }] });
  });

  it("frees a leg a re-paired flight gives up, also under its AODB id", () => {
    // The departure now pairs with another arrival, and its route changed too:
    // only the AODB id still finds it.
    const existing = [saved(turnaround(a1, d1), "f1")];
    const a2 = leg(3, "QQ3", "AAA", "BUD", "2026-10-01T08:30:00Z");
    const diverted = leg(2, "QQ2", "BUD", "CCC", "2026-10-01T09:00:00Z");
    const diff = diffImport({
      plan: { turnarounds: [turnaround(a1, null), turnaround(a2, diverted)] },
      existing,
      airlines: [QQ],
      profileId: "ikarus",
      period: null,
    });
    const byKind = Object.fromEntries(diff.entries.map((e) => [e.kind, e]));
    expect(diff.entries.map((e) => e.kind).sort()).toEqual(["changed", "new"]);
    expect(byKind.changed).toMatchObject({ flightId: "f1", repair: true });
    // One flight keeps the arrival, the other leg goes to the new flight; nothing is lost.
    expect(byKind.new.turnaround.arrival?.aodbId ?? byKind.new.turnaround.departure?.aodbId).toBeDefined();
  });

  it("falls back to the flight number when the AODB id is new, e.g. a flight typed in before", () => {
    const existing = [{ ...saved(turnaround(a1, d1), "f1"), arrivalAodbId: null, departureAodbId: null }];
    const diff = diffImport({ plan: { turnarounds: [turnaround(a1, d1)] }, existing, airlines: [QQ], profileId: "ikarus", period: null });
    expect(diff.entries).toEqual([expect.objectContaining({ kind: "unchanged", flightId: "f1" })]);
  });
});
