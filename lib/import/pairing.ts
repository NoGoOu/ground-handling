import { toLocalDate } from "@/lib/time";
import type { FlightKind } from "@/lib/turnaround";
import { legsFromRow, resolveMapping, withMargin, type ImportMapping, type Leg, type RowError } from "./mapping";
import type { Table } from "./read";

// Turnarounds from the legs of a schedule file (3. mérföldkő, 4. lépés;
// docs/schedule-import.md, "Fordulók képzése").

/** The station the import is for. */
export const HOME_STATION = "BUD";

export interface ImportedTurnaround {
  kind: FlightKind;
  airline: string;
  /** The leg arriving at the home station. */
  arrival: Leg | null;
  /** The leg leaving the home station. */
  departure: Leg | null;
}

export type PairingWarning =
  | { kind: "nextNotFound"; arrival: Leg }
  | { kind: "nextTaken"; arrival: Leg }
  | { kind: "duplicate"; leg: Leg };

export interface PairingResult {
  turnarounds: ImportedTurnaround[];
  warnings: PairingWarning[];
}

const legKey = (leg: Leg) => `${leg.flightNumber} ${leg.flightDate} ${leg.origin} ${leg.destination}`;

/** The same flight on the same day twice: the first row wins. */
function withoutDuplicates(legs: readonly Leg[], warnings: PairingWarning[]): Leg[] {
  const seen = new Set<string>();
  return legs.filter((leg) => {
    const key = legKey(leg);
    if (seen.has(key)) {
      warnings.push({ kind: "duplicate", leg });
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Pairs each arrival with the first instance of its next flight that leaves
 * the station after it. An arrival without a next flight stays here
 * (arrival-only); a departure that is nobody's next flight was already here
 * (departure-only), see rule 11. Legs not touching the station are left out.
 */
export function pairLegs(legs: readonly Leg[], station = HOME_STATION): PairingResult {
  const warnings: PairingWarning[] = [];
  const unique = withoutDuplicates(legs, warnings);
  const arrivals = unique.filter((leg) => leg.destination === station).sort((a, b) => +a.sta - +b.sta);
  const departures = unique.filter((leg) => leg.origin === station && leg.destination !== station);

  const departuresByFlight = new Map<string, Leg[]>();
  for (const leg of departures) {
    const list = departuresByFlight.get(leg.flightNumber) ?? [];
    list.push(leg);
    departuresByFlight.set(leg.flightNumber, list);
  }
  for (const list of departuresByFlight.values()) list.sort((a, b) => +a.std - +b.std);

  const used = new Set<Leg>();
  const turnarounds: ImportedTurnaround[] = [];
  for (const arrival of arrivals) {
    let departure: Leg | null = null;
    if (arrival.next) {
      const first = departuresByFlight.get(arrival.next)?.find((leg) => +leg.std > +arrival.sta) ?? null;
      if (!first) warnings.push({ kind: "nextNotFound", arrival });
      else if (used.has(first)) warnings.push({ kind: "nextTaken", arrival });
      else departure = first;
    }
    if (departure) used.add(departure);
    turnarounds.push({
      kind: departure ? "TURNAROUND" : "ARRIVAL_ONLY",
      airline: arrival.airline,
      arrival,
      departure,
    });
  }
  for (const departure of departures) {
    if (!used.has(departure)) {
      turnarounds.push({ kind: "DEPARTURE_ONLY", airline: departure.airline, arrival: null, departure });
    }
  }
  turnarounds.sort((a, b) => +(a.arrival?.sta ?? a.departure!.std) - +(b.arrival?.sta ?? b.departure!.std));
  return { turnarounds, warnings };
}

/** Minutes on the ground between the paired STA and STD; we count it, the file's figure is not used. */
export function groundMinutes(turnaround: ImportedTurnaround): number | null {
  if (!turnaround.arrival || !turnaround.departure) return null;
  return Math.round((+turnaround.departure.std - +turnaround.arrival.sta) / 60_000);
}

/** A turnaround belongs to the range when its arrival or departure falls on one of its Budapest days. */
export function inRange(turnaround: ImportedTurnaround, range: { start: string; end: string }): boolean {
  const days = [turnaround.arrival && toLocalDate(turnaround.arrival.sta), turnaround.departure && toLocalDate(turnaround.departure.std)];
  return days.some((day) => day !== null && day >= range.start && day <= range.end);
}

export interface ImportPlan {
  turnarounds: ImportedTurnaround[];
  warnings: PairingWarning[];
  rowErrors: RowError[];
  /** Data rows of other stations, left out before reading them. */
  filteredRows: number;
  /** Data rows of the table. */
  totalRows: number;
}

/**
 * The whole way from a table to turnarounds: every row to legs, the station
 * filter, the pairing, and the date range. Legs are read with a margin around
 * the range, so a turnaround across its edge still pairs.
 */
export function planImport(
  table: Table,
  mapping: ImportMapping,
  range?: { start: string; end: string },
  station = HOME_STATION,
): ImportPlan {
  const resolved = resolveMapping(mapping, table.headers);
  const stationOf = (cell: unknown) => String(cell ?? "").trim().toUpperCase();
  const legs: Leg[] = [];
  const rowErrors: RowError[] = [];
  let filteredRows = 0;
  table.rows.forEach((row, index) => {
    // The station filter comes first: a row of another station is not read at all.
    if (stationOf(row[resolved.origin]) !== station && stationOf(row[resolved.destination]) !== station) {
      filteredRows++;
      return;
    }
    const result = legsFromRow(row, index + 1, resolved, range && withMargin(range));
    rowErrors.push(...result.errors);
    legs.push(...result.legs);
  });
  const { turnarounds, warnings } = pairLegs(legs, station);
  return {
    turnarounds: range ? turnarounds.filter((t) => inRange(t, range)) : turnarounds,
    warnings,
    rowErrors,
    filteredRows,
    totalRows: table.rows.length,
  };
}
