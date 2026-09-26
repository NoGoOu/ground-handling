import { describe, expect, it } from "vitest";
import { diffImport, planPeriod, scheduleChanges, type ExistingFlight } from "@/lib/import/diff";
import type { Leg } from "@/lib/import/mapping";
import { NETLINE_MAPPING, netlineTable } from "@/lib/import/netline.fixture";
import { pairLegs, planImport, type ImportedTurnaround } from "@/lib/import/pairing";

const plan = planImport(netlineTable(), NETLINE_MAPPING);
/** The first turnaround with both parts. */
const full = plan.turnarounds.find((t) => t.kind === "TURNAROUND")!;
const FR = { id: "fr", code: "FR", defaultTemplateId: "tpl" };
const PROFILE = "netline";

/** A flight as a previous import of the same file would have saved it. */
function saved(t: ImportedTurnaround, id: string, overrides: Partial<ExistingFlight> = {}): ExistingFlight {
  return {
    id,
    airline: t.airline,
    inboundFlightNumber: t.arrival?.flightNumber ?? null,
    outboundFlightNumber: t.departure?.flightNumber ?? null,
    arrivalFlightDate: t.arrival?.flightDate ?? null,
    departureFlightDate: t.departure?.flightDate ?? null,
    origin: t.arrival?.origin ?? null,
    destination: t.departure?.destination ?? null,
    sta: t.arrival?.sta ?? null,
    std: t.departure?.std ?? null,
    aircraftType: t.departure?.aircraftType ?? t.arrival?.aircraftType ?? null,
    aircraftConfig: t.departure?.aircraftConfig ?? t.arrival?.aircraftConfig ?? null,
    arrivalRegistration: null,
    departureRegistration: null,
    importProfileId: PROFILE,
    source: "IMPORT",
    operational: false,
    ...overrides,
  };
}

const kinds = (entries: { kind: string }[]) =>
  entries.reduce<Record<string, number>>((counts, e) => ({ ...counts, [e.kind]: (counts[e.kind] ?? 0) + 1 }), {});

describe("first import of the sample", () => {
  it("creates every turnaround with the airline's default template", () => {
    const diff = diffImport({ plan, existing: [], airlines: [FR], profileId: PROFILE, period: planPeriod(plan, null) });
    expect(kinds(diff.entries)).toEqual({ new: 50 });
    expect(diff.entries[0]).toMatchObject({ kind: "new", airlineId: "fr", templateId: "tpl" });
    expect(diff.missing).toEqual([]);
  });

  it("marks every row as an error while the airline is unknown or has no default template", () => {
    expect(kinds(diffImport({ plan, existing: [], airlines: [], profileId: null, period: null }).entries)).toEqual({
      error: 50,
    });
    const noTemplate = diffImport({
      plan,
      existing: [],
      airlines: [{ ...FR, defaultTemplateId: null }],
      profileId: null,
      period: null,
    });
    expect(noTemplate.entries[0]).toMatchObject({ kind: "error", reason: "noTemplate" });
  });
});

describe("importing the sample again", () => {
  const existing = plan.turnarounds.map((t, index) => saved(t, `f${index}`));

  it("finds every flight unchanged, without duplicates", () => {
    const diff = diffImport({ plan, existing, airlines: [FR], profileId: PROFILE, period: planPeriod(plan, null) });
    expect(kinds(diff.entries)).toEqual({ unchanged: 50 });
    expect(diff.missing).toEqual([]);
    expect(diff.present).toHaveLength(50);
  });

  it("reports a moved STA as a change of that field only", () => {
    const moved = existing.map((f, index) => (index === 0 ? { ...f, sta: new Date(+f.sta! - 5 * 60_000) } : f));
    const diff = diffImport({ plan, existing: moved, airlines: [FR], profileId: PROFILE, period: null });
    expect(diff.entries[0]).toMatchObject({ kind: "changed", repair: false, changes: [{ field: "sta" }] });
    expect(kinds(diff.entries)).toEqual({ changed: 1, unchanged: 49 });
  });

  /** A flight the file no longer has: other flight numbers on a day of the file. */
  const gone = saved(full, "gone", { inboundFlightNumber: "FR9999", outboundFlightNumber: "FR9998" });

  it("marks a flight of the same profile missing from the file, per part", () => {
    const otherProfile = { ...gone, id: "other", importProfileId: "another" };
    const diff = diffImport({
      plan,
      existing: [...existing, gone, otherProfile],
      airlines: [FR],
      profileId: PROFILE,
      period: planPeriod(plan, null),
    });
    expect(diff.missing).toEqual([{ flightId: "gone", parts: ["ARRIVAL_PART", "DEPARTURE_PART"] }]);
  });

  it("does not look outside the file's period", () => {
    const later = { ...gone, sta: new Date("2026-01-01T10:00:00Z"), std: new Date("2026-01-01T11:00:00Z") };
    const diff = diffImport({ plan, existing: [later], airlines: [FR], profileId: PROFILE, period: planPeriod(plan, null) });
    expect(diff.missing).toEqual([]);
  });
});

describe("a flight typed in by hand", () => {
  it("is found by flight number and day, and gets its stations", () => {
    const manual = saved(full, "manual", {
      arrivalFlightDate: null,
      departureFlightDate: null,
      origin: null,
      destination: null,
      importProfileId: null,
    });
    const diff = diffImport({ plan, existing: [manual], airlines: [FR], profileId: PROFILE, period: null });
    const entry = diff.entries.find((e) => e.turnaround === full);
    expect(entry).toMatchObject({ kind: "changed", flightId: "manual", repair: false });
    expect(entry?.kind === "changed" && entry.changes.map((c) => c.field)).toEqual(["origin", "destination"]);
  });
});

describe("a pairing that changed", () => {
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
    registration: null,
    next: null,
    ...overrides,
  });
  const arrivalA = leg({ next: "FR2" });
  const departureD = leg({ flightNumber: "FR2", origin: "BUD", destination: "STN", std: new Date("2024-09-10T08:00:00Z") });
  const departureX = leg({ flightNumber: "FR3", origin: "BUD", destination: "DUB", std: new Date("2024-09-10T09:00:00Z") });
  /** Before: A → X. Now: A → D, and X leaves on its own. */
  const before: ImportedTurnaround = { kind: "TURNAROUND", airline: "FR", arrival: arrivalA, departure: departureX };
  const now = pairLegs([arrivalA, departureD, departureX]);

  it("re-pairs a flight without operational data, and the freed leg becomes a new flight", () => {
    const diff = diffImport({ plan: now, existing: [saved(before, "f")], airlines: [FR], profileId: null, period: null });
    const [paired, alone] = diff.entries;
    expect(paired).toMatchObject({ kind: "changed", flightId: "f", repair: true });
    expect(alone).toMatchObject({ kind: "new" });
    expect(alone.turnaround.departure).toBe(departureX);
  });

  it("leaves a flight with operational data alone", () => {
    const busy = saved(before, "f", { operational: true });
    const diff = diffImport({ plan: now, existing: [busy], airlines: [FR], profileId: null, period: null });
    expect(diff.entries.find((e) => e.turnaround.arrival === arrivalA)).toMatchObject({
      kind: "conflict",
      reason: "operational",
    });
  });

  it("does not drop a leg the file no longer has", () => {
    const onlyAD = pairLegs([arrivalA, departureD]);
    const diff = diffImport({ plan: onlyAD, existing: [saved(before, "f")], airlines: [FR], profileId: null, period: null });
    expect(diff.entries[0]).toMatchObject({ kind: "conflict", reason: "lostLeg" });
  });
});

describe("two one-sided flights the file pairs into a turnaround", () => {
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
    registration: null,
    next: null,
    ...overrides,
  });
  const arrivalA = leg({ next: "FR2" });
  const departureD = leg({ flightNumber: "FR2", origin: "BUD", destination: "STN", std: new Date("2024-09-10T08:00:00Z") });
  const arrivalOnly: ImportedTurnaround = { kind: "ARRIVAL_ONLY", airline: "FR", arrival: arrivalA, departure: null };
  const departureOnly: ImportedTurnaround = { kind: "DEPARTURE_ONLY", airline: "FR", arrival: null, departure: departureD };
  const now = pairLegs([arrivalA, departureD]);
  const run = (existing: ExistingFlight[]) =>
    diffImport({ plan: now, existing, airlines: [FR], profileId: PROFILE, period: planPeriod(now, null) });

  it("merges them: the arrival flight takes the departure, the departure flight goes", () => {
    const diff = run([saved(arrivalOnly, "a"), saved(departureOnly, "d")]);
    expect(diff.entries).toHaveLength(1);
    expect(diff.entries[0]).toMatchObject({ kind: "changed", flightId: "a", merges: "d", repair: false });
    const entry = diff.entries[0];
    expect(entry.kind === "changed" && entry.changes.map((c) => c.field)).toEqual(["std", "destination"]);
    // The deleted flight is neither missing nor found again; the kept one is found.
    expect(diff.missing).toEqual([]);
    expect(diff.present).toEqual(["a"]);
  });

  it("keeps the flight somebody has worked on and deletes the other", () => {
    const diff = run([saved(arrivalOnly, "a", { operational: true }), saved(departureOnly, "d")]);
    expect(diff.entries[0]).toMatchObject({ kind: "changed", flightId: "a", merges: "d" });
    const busyDeparture = run([saved(arrivalOnly, "a"), saved(departureOnly, "d", { operational: true })]);
    expect(busyDeparture.entries[0]).toMatchObject({ kind: "changed", flightId: "d", merges: "a" });
  });

  it("never deletes a flight typed in by hand", () => {
    const diff = run([saved(arrivalOnly, "a"), saved(departureOnly, "d", { source: "MANUAL" })]);
    expect(diff.entries[0]).toMatchObject({ kind: "changed", flightId: "d", merges: "a" });
  });

  it("leaves the decision to the planner when neither may go", () => {
    for (const existing of [
      [saved(arrivalOnly, "a", { operational: true }), saved(departureOnly, "d", { operational: true })],
      [saved(arrivalOnly, "a", { source: "MANUAL" }), saved(departureOnly, "d", { operational: true })],
      [saved(arrivalOnly, "a", { source: "MANUAL" }), saved(departureOnly, "d", { source: "MANUAL" })],
    ]) {
      expect(run(existing).entries[0]).toMatchObject({ kind: "conflict", reason: "merge", flightIds: ["a", "d"] });
    }
  });

  it("does not merge a flight that has another leg", () => {
    const departureX = leg({ flightNumber: "FR3", origin: "BUD", destination: "DUB", std: new Date("2024-09-10T09:00:00Z") });
    const turnaround: ImportedTurnaround = { kind: "TURNAROUND", airline: "FR", arrival: arrivalA, departure: departureX };
    const plan = pairLegs([arrivalA, departureD, departureX]);
    const diff = diffImport({
      plan,
      existing: [saved(turnaround, "t"), saved(departureOnly, "d")],
      airlines: [FR],
      profileId: null,
      period: null,
    });
    expect(diff.entries.find((e) => e.turnaround.arrival === arrivalA)).toMatchObject({ kind: "conflict", reason: "merge" });
  });
});

describe("registration from the file (7. mérföldkő)", () => {
  it("is written only when the file gives one", () => {
    const flight = saved(full, "f", { arrivalRegistration: "HALYB" });
    expect(scheduleChanges(flight, full)).toEqual([]);
    const withReg = { ...full, arrival: { ...full.arrival!, registration: "HALYC" } };
    expect(scheduleChanges(flight, withReg)).toEqual([{ field: "arrivalRegistration", from: "HALYB", to: "HALYC" }]);
  });
});
