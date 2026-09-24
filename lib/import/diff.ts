import { toLocalDate } from "@/lib/time";
import type { Part } from "@/lib/turnaround";
import type { Leg } from "./mapping";
import type { ImportedTurnaround, ImportPlan } from "./pairing";

// Dry run of an import (3. mérföldkő, 6. lépés): the planned turnarounds
// against the flights in the database. Pure; the save (7. lépés) writes
// exactly what this decides. A leg is identified by airline + flight number +
// operating date + station; a flight typed in by hand, which has no operating
// date, by its flight number and the Budapest day of its STA or STD.

export interface ExistingFlight {
  id: string;
  /** IATA code of the airline. */
  airline: string;
  inboundFlightNumber: string | null;
  outboundFlightNumber: string | null;
  /** "YYYY-MM-DD"; null on a flight typed in by hand. */
  arrivalFlightDate: string | null;
  departureFlightDate: string | null;
  origin: string | null;
  destination: string | null;
  sta: Date | null;
  std: Date | null;
  aircraftType: string | null;
  aircraftConfig: string | null;
  importProfileId: string | null;
  /** Records, estimates, actuals, cancellations or agents: the pairing may not change. */
  operational: boolean;
}

export interface AirlineInfo {
  id: string;
  code: string;
  defaultTemplateId: string | null;
}

export type ScheduleField = "sta" | "std" | "origin" | "destination" | "aircraftType" | "aircraftConfig";

export interface FieldChange {
  field: ScheduleField;
  from: string | Date | null;
  to: string | Date | null;
}

export type DiffEntry =
  | { kind: "new"; turnaround: ImportedTurnaround; airlineId: string; templateId: string }
  | { kind: "unchanged"; turnaround: ImportedTurnaround; flightId: string }
  | {
      kind: "changed";
      turnaround: ImportedTurnaround;
      flightId: string;
      changes: FieldChange[];
      /** The flight's pairing changes too; allowed because it has no operational data. */
      repair: boolean;
      /** On a re-pairing, the part the flight keeps; the other one is replaced. */
      kept?: Part;
    }
  | { kind: "conflict"; turnaround: ImportedTurnaround; flightIds: string[]; reason: ConflictReason }
  | { kind: "error"; turnaround: ImportedTurnaround; reason: "unknownAirline" | "noTemplate" };

/** Why a new pairing cannot be written. */
export type ConflictReason = "operational" | "merge" | "lostLeg";

export interface MissingFlight {
  flightId: string;
  parts: Part[];
}

export interface ImportDiff {
  entries: DiffEntry[];
  missing: MissingFlight[];
  /** Flights of the profile, in the period, found again: their missing marker goes. */
  present: string[];
}

const arrivalKey = (flightNumber: string, date: string, station: string) => `A|${flightNumber}|${date}|${station}`;
const departureKey = (flightNumber: string, date: string, station: string) => `D|${flightNumber}|${date}|${station}`;
const manualArrivalKey = (flightNumber: string, sta: Date) => `MA|${flightNumber}|${toLocalDate(sta)}`;
const manualDepartureKey = (flightNumber: string, std: Date) => `MD|${flightNumber}|${toLocalDate(std)}`;

const legArrivalKey = (leg: Leg) => arrivalKey(leg.flightNumber, leg.flightDate, leg.origin);
const legDepartureKey = (leg: Leg) => departureKey(leg.flightNumber, leg.flightDate, leg.destination);

function existingArrivalKey(flight: ExistingFlight): string | null {
  if (!flight.inboundFlightNumber || !flight.sta) return null;
  return flight.arrivalFlightDate && flight.origin
    ? arrivalKey(flight.inboundFlightNumber, flight.arrivalFlightDate, flight.origin)
    : manualArrivalKey(flight.inboundFlightNumber, flight.sta);
}

function existingDepartureKey(flight: ExistingFlight): string | null {
  if (!flight.outboundFlightNumber || !flight.std) return null;
  return flight.departureFlightDate && flight.destination
    ? departureKey(flight.outboundFlightNumber, flight.departureFlightDate, flight.destination)
    : manualDepartureKey(flight.outboundFlightNumber, flight.std);
}

const same = (a: string | Date | null, b: string | Date | null) =>
  a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b;

/** The schedule fields the import writes that differ on the flight. */
export function scheduleChanges(flight: ExistingFlight, turnaround: ImportedTurnaround): FieldChange[] {
  const { arrival, departure } = turnaround;
  const wanted: Record<ScheduleField, string | Date | null> = {
    sta: arrival?.sta ?? null,
    std: departure?.std ?? null,
    origin: arrival?.origin ?? null,
    destination: departure?.destination ?? null,
    aircraftType: departure?.aircraftType ?? arrival?.aircraftType ?? null,
    aircraftConfig: departure?.aircraftConfig ?? arrival?.aircraftConfig ?? null,
  };
  return (Object.keys(wanted) as ScheduleField[])
    .filter((field) => !same(flight[field], wanted[field]))
    .map((field) => ({ field, from: flight[field], to: wanted[field] }));
}

export function diffImport({
  plan,
  existing,
  airlines,
  profileId,
  period,
}: {
  plan: Pick<ImportPlan, "turnarounds">;
  existing: readonly ExistingFlight[];
  airlines: readonly AirlineInfo[];
  /** The profile of the import; flights of other profiles are never marked missing. */
  profileId: string | null;
  /** Budapest days the file covers; the missing check stays inside. */
  period: { start: string; end: string } | null;
}): ImportDiff {
  const byKey = new Map<string, ExistingFlight>();
  for (const flight of existing) {
    for (const key of [existingArrivalKey(flight), existingDepartureKey(flight)]) if (key) byKey.set(key, flight);
  }

  // A leg a re-paired flight gives up is free for another turnaround.
  const released = new Set<string>();
  const find = (keys: (string | null)[]): ExistingFlight | null => {
    for (const key of keys) {
      if (key && !released.has(key) && byKey.has(key)) return byKey.get(key)!;
    }
    return null;
  };
  const flightOfArrival = (leg: Leg | null) =>
    leg ? find([legArrivalKey(leg), manualArrivalKey(leg.flightNumber, leg.sta)]) : null;
  const flightOfDeparture = (leg: Leg | null) =>
    leg ? find([legDepartureKey(leg), manualDepartureKey(leg.flightNumber, leg.std)]) : null;

  const plannedKeys = new Set<string>();
  for (const { arrival, departure } of plan.turnarounds) {
    if (arrival) plannedKeys.add(legArrivalKey(arrival));
    if (departure) plannedKeys.add(legDepartureKey(departure));
  }
  const airlineByCode = new Map(airlines.map((airline) => [airline.code, airline]));

  const claimed = new Set<string>();
  const entries: DiffEntry[] = [];

  // Exact pairings first, so a re-pairing never takes a flight that stays as it is.
  const order = [...plan.turnarounds].sort((a, b) => Number(!isSamePairing(a)) - Number(!isSamePairing(b)));
  function isSamePairing(t: ImportedTurnaround): boolean {
    const byArrival = flightOfArrival(t.arrival);
    const byDeparture = flightOfDeparture(t.departure);
    if (t.arrival && t.departure) return !!byArrival && byArrival === byDeparture;
    if (t.arrival) return !!byArrival && !byArrival.outboundFlightNumber;
    return !!byDeparture && !byDeparture.inboundFlightNumber;
  }

  for (const turnaround of order) {
    const byArrival = flightOfArrival(turnaround.arrival);
    const byDeparture = flightOfDeparture(turnaround.departure);

    if (!byArrival && !byDeparture) {
      const airline = airlineByCode.get(turnaround.airline);
      if (!airline) entries.push({ kind: "error", turnaround, reason: "unknownAirline" });
      else if (!airline.defaultTemplateId) entries.push({ kind: "error", turnaround, reason: "noTemplate" });
      else entries.push({ kind: "new", turnaround, airlineId: airline.id, templateId: airline.defaultTemplateId });
      continue;
    }

    const carrier = (byArrival ?? byDeparture)!;
    if (isSamePairing(turnaround) && !claimed.has(carrier.id)) {
      claimed.add(carrier.id);
      const changes = scheduleChanges(carrier, turnaround);
      entries.push(
        changes.length === 0
          ? { kind: "unchanged", turnaround, flightId: carrier.id }
          : { kind: "changed", turnaround, flightId: carrier.id, changes, repair: false },
      );
      continue;
    }

    // The pairing differs. Re-pair only a flight without operational data, and
    // only when no flight has to disappear and no leg gets lost.
    const flightIds = [...new Set([byArrival?.id, byDeparture?.id].filter((id): id is string => !!id))];
    // The carrier's other leg, if the new pairing does not keep it.
    const [otherLeg, wantedLeg] =
      carrier === byArrival
        ? [existingDepartureKey(carrier), turnaround.departure && legDepartureKey(turnaround.departure)]
        : [existingArrivalKey(carrier), turnaround.arrival && legArrivalKey(turnaround.arrival)];
    const dropped = otherLeg && otherLeg !== wantedLeg ? otherLeg : null;
    let reason: ConflictReason | null = null;
    if (byArrival && byDeparture && byArrival !== byDeparture) reason = "merge";
    else if (carrier.operational || claimed.has(carrier.id)) reason = "operational";
    else if (dropped && !plannedKeys.has(dropped)) reason = "lostLeg";

    if (reason) {
      entries.push({ kind: "conflict", turnaround, flightIds, reason });
      continue;
    }
    claimed.add(carrier.id);
    if (dropped) released.add(dropped);
    entries.push({
      kind: "changed",
      turnaround,
      flightId: carrier.id,
      changes: scheduleChanges(carrier, turnaround),
      repair: true,
      kept: carrier === byArrival ? "ARRIVAL_PART" : "DEPARTURE_PART",
    });
  }

  // Missing: legs of the same profile, in the file's period, not in the file.
  const missing: MissingFlight[] = [];
  const present: string[] = [];
  const inPeriod = (date: Date | null) =>
    !!date && !!period && toLocalDate(date) >= period.start && toLocalDate(date) <= period.end;
  if (profileId && period) {
    for (const flight of existing) {
      if (flight.importProfileId !== profileId) continue;
      const parts: Part[] = [];
      const arrival = existingArrivalKey(flight);
      const departure = existingDepartureKey(flight);
      if (arrival && inPeriod(flight.sta) && !plannedKeys.has(arrival)) parts.push("ARRIVAL_PART");
      if (departure && inPeriod(flight.std) && !plannedKeys.has(departure)) parts.push("DEPARTURE_PART");
      if (parts.length > 0) missing.push({ flightId: flight.id, parts });
      else if (inPeriod(flight.sta) || inPeriod(flight.std)) present.push(flight.id);
    }
  }

  // Back in the file's order.
  const position = new Map(plan.turnarounds.map((t, index) => [t, index]));
  entries.sort((a, b) => position.get(a.turnaround)! - position.get(b.turnaround)!);
  return { entries, missing, present };
}

/** The Budapest days the plan covers: the range when given, else its first and last day. */
export function planPeriod(
  plan: Pick<ImportPlan, "turnarounds">,
  range: { start: string; end: string } | null,
): { start: string; end: string } | null {
  if (range) return range;
  const days = plan.turnarounds.flatMap((t) => [
    ...(t.arrival ? [toLocalDate(t.arrival.sta)] : []),
    ...(t.departure ? [toLocalDate(t.departure.std)] : []),
  ]);
  if (days.length === 0) return null;
  days.sort();
  return { start: days[0], end: days.at(-1)! };
}
