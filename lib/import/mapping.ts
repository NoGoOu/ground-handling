import { normaliseRegistration } from "@/lib/flight";
import { addDays } from "@/lib/time";
import type { Cell } from "./read";
import {
  cleanText,
  combineDateTime,
  expandPeriod,
  isBlank,
  normaliseFlightNumber,
  parseDate,
  parseDateTime,
  parseDayOffset,
  parsePattern,
  parseTime,
  type TimeZone,
} from "./transform";

// A column mapping and what it makes of a row: flight legs, one per operating
// date (3. mérföldkő, 3. lépés). A profile stores this mapping.

export const TARGET_FIELDS = [
  "airline",
  "flightNumber",
  "suffix",
  "origin",
  "destination",
  "date",
  "periodFrom",
  "periodTill",
  "pattern",
  "std",
  "sta",
  "dayOffset",
  "aircraftType",
  "aircraftConfig",
  "registration",
  "nextAirline",
  "nextFlightNumber",
] as const;

export type TargetField = (typeof TARGET_FIELDS)[number];

/** Columns are referred to by their header text, so a profile reads naturally. */
export interface ImportMapping {
  sheet: string;
  /** 1-based row number of the header in the sheet. */
  headerRow: number;
  columns: Partial<Record<TargetField, string>>;
  /** The times of the file: UTC, or Budapest local time. */
  timeZone: TimeZone;
}

export const REQUIRED_FIELDS: readonly TargetField[] = ["flightNumber", "origin", "destination", "std", "sta"];
const PERIOD_FIELDS: readonly TargetField[] = ["periodFrom", "periodTill", "pattern"];

export type MappingProblem =
  | { kind: "missingField"; field: TargetField }
  | { kind: "unknownColumn"; field: TargetField; column: string }
  | { kind: "incompletePeriod" };

/**
 * A mapping is usable when every required field has a column the table has,
 * and a period, if used, is complete. Without a date or a period the STD and
 * STA columns must hold full dates and times.
 */
export function mappingProblems(mapping: ImportMapping, headers: readonly string[]): MappingProblem[] {
  const problems: MappingProblem[] = [];
  for (const field of REQUIRED_FIELDS) {
    if (!mapping.columns[field]) problems.push({ kind: "missingField", field });
  }
  for (const [field, column] of Object.entries(mapping.columns) as [TargetField, string][]) {
    if (column && !headers.includes(column)) problems.push({ kind: "unknownColumn", field, column });
  }
  const periodFields = PERIOD_FIELDS.filter((field) => mapping.columns[field]);
  if (periodFields.length > 0 && periodFields.length < PERIOD_FIELDS.length) {
    problems.push({ kind: "incompletePeriod" });
  }
  return problems;
}

/** One flight on one operating date, as the file describes it. */
export interface Leg {
  /** 1-based data row of the file. */
  row: number;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  /** Operating date: the departure day at the origin. */
  flightDate: string;
  std: Date;
  /** Shifted by the day offset. */
  sta: Date;
  aircraftType: string | null;
  aircraftConfig: string | null;
  /** The planned registration, if the file says (7. mérföldkő). */
  registration: string | null;
  /** The aircraft's next flight, if the file says. */
  next: string | null;
}

export type RowErrorCode =
  | "flightNumber"
  | "station"
  | "date"
  | "period"
  | "pattern"
  | "std"
  | "sta"
  | "dayOffset"
  | "nextFlight";

export interface RowError {
  row: number;
  code: RowErrorCode;
  /** The raw text that could not be read. */
  value: string;
}

export interface RowResult {
  legs: Leg[];
  errors: RowError[];
}

/** Column indexes of a mapping in a table; -1 when a field is not mapped. */
export type ResolvedMapping = Record<TargetField, number> & { timeZone: TimeZone };

export function resolveMapping(mapping: ImportMapping, headers: readonly string[]): ResolvedMapping {
  const resolved = Object.fromEntries(
    TARGET_FIELDS.map((field) => [field, mapping.columns[field] ? headers.indexOf(mapping.columns[field]!) : -1]),
  ) as Record<TargetField, number>;
  return { ...resolved, timeZone: mapping.timeZone };
}

const STATION = /^[A-Z]{3}$/;

/**
 * The legs of one data row. A row with a period gives one leg per operating
 * date within the range (when given); a row with a date column gives one leg.
 */
export function legsFromRow(
  row: readonly Cell[],
  rowNumber: number,
  mapping: ResolvedMapping,
  range?: { start: string; end: string },
): RowResult {
  const cell = (field: TargetField): Cell => (mapping[field] >= 0 ? (row[mapping[field]] ?? null) : null);
  const errors: RowError[] = [];
  const fail = (code: RowErrorCode, field: TargetField): RowResult => {
    errors.push({ row: rowNumber, code, value: String(cell(field) ?? "") });
    return { legs: [], errors };
  };

  const flight = normaliseFlightNumber(cell("airline"), cell("flightNumber"), cell("suffix"));
  if (!flight) return fail("flightNumber", "flightNumber");
  const origin = cleanText(cell("origin"))?.toUpperCase() ?? "";
  const destination = cleanText(cell("destination"))?.toUpperCase() ?? "";
  if (!STATION.test(origin)) return fail("station", "origin");
  if (!STATION.test(destination)) return fail("station", "destination");

  const dayOffset = parseDayOffset(cell("dayOffset"));
  if (dayOffset === null) return fail("dayOffset", "dayOffset");

  // The next flight belongs to the same airline unless the file says otherwise.
  let next: string | null = null;
  if (!isBlank(cell("nextFlightNumber"))) {
    const nextAirline = isBlank(cell("nextAirline")) ? flight.airline : cell("nextAirline");
    const parsed = normaliseFlightNumber(nextAirline, cell("nextFlightNumber"));
    if (!parsed) return fail("nextFlight", "nextFlightNumber");
    next = parsed.flightNumber;
  }

  const base = {
    row: rowNumber,
    airline: flight.airline,
    flightNumber: flight.flightNumber,
    origin,
    destination,
    aircraftType: cleanText(cell("aircraftType")),
    aircraftConfig: cleanText(cell("aircraftConfig")),
    registration: normaliseRegistration(cleanText(cell("registration"))),
    next,
  };

  // Where the dates come from: a period, a date column, or full date-times in
  // the STD and STA cells. Then the times, and the arrival's day shift.
  let dates: string[];
  let times: { std: number; sta: number; staOffset: number };
  const inRange = (date: string) => !range || (date >= range.start && date <= range.end);

  if (mapping.periodFrom >= 0 || mapping.date >= 0) {
    if (mapping.periodFrom >= 0) {
      const from = parseDate(cell("periodFrom"));
      const till = parseDate(cell("periodTill"));
      if (!from) return fail("date", "periodFrom");
      if (!till) return fail("date", "periodTill");
      const pattern = parsePattern(cell("pattern"));
      if (!pattern) return fail("pattern", "pattern");
      const expanded = expandPeriod(from, till, pattern, range);
      if (!expanded) return fail("period", "periodTill");
      dates = expanded;
    } else {
      const date = parseDate(cell("date"));
      if (!date) return fail("date", "date");
      dates = inRange(date) ? [date] : [];
    }
    const std = parseTime(cell("std"));
    const sta = parseTime(cell("sta"));
    if (std === null) return fail("std", "std");
    if (sta === null) return fail("sta", "sta");
    times = { std, sta, staOffset: dayOffset };
  } else {
    const std = parseDateTime(cell("std"));
    const sta = parseDateTime(cell("sta"));
    if (!std) return fail("std", "std");
    if (!sta) return fail("sta", "sta");
    dates = inRange(std.date) ? [std.date] : [];
    // The arrival carries its own date: its shift is its distance from the departure day.
    const staOffset = Math.round(
      (Date.parse(`${sta.date}T00:00:00Z`) - Date.parse(`${std.date}T00:00:00Z`)) / 86_400_000,
    );
    times = { std: std.minutes, sta: sta.minutes, staOffset };
  }

  return {
    legs: dates.map((date) => ({
      ...base,
      flightDate: date,
      std: combineDateTime(date, times.std, mapping.timeZone),
      sta: combineDateTime(date, times.sta, mapping.timeZone, times.staOffset),
    })),
    errors,
  };
}

/** The range widened by a day each side, so that legs crossing its edges still pair. */
export function withMargin(range: { start: string; end: string }, days = 2): { start: string; end: string } {
  return { start: addDays(range.start, -days), end: addDays(range.end, days) };
}
