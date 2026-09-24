import { addDays, localToUtc, parseLocalDate } from "@/lib/time";
import type { Cell } from "./read";

// Transformations of the schedule import (3. mérföldkő, 3. lépés). Pure
// functions over raw cells; each returns null when the cell cannot be read, and
// the caller turns that into a row error.

/** Cells that mean "nothing here" in exports, e.g. NetLine's "N/A" next flight. */
const BLANK_TOKENS = new Set(["", "N/A", "NA", "-", "--", "NULL"]);

export function isBlank(cell: Cell): boolean {
  return cell === null || BLANK_TOKENS.has(String(cell).trim().toUpperCase());
}

/** Trimmed text, or null for a blank cell. */
export function cleanText(cell: Cell): string | null {
  return isBlank(cell) ? null : String(cell).trim();
}

export interface FlightNumber {
  /** Airline designator, e.g. "FR". */
  airline: string;
  /** Designator + number (+ suffix), e.g. "FR428". */
  flightNumber: string;
}

/**
 * Flight number from an airline cell and a number cell (" 428" → "FR428",
 * "055" → "FR55"), or from one combined cell ("FR 0428"). Leading zeros go, so
 * the same flight always gets the same identity.
 */
export function normaliseFlightNumber(airlineCell: Cell, numberCell: Cell, suffixCell: Cell = null): FlightNumber | null {
  const numberText = cleanText(numberCell)?.toUpperCase().replace(/\s+/g, "");
  if (!numberText) return null;
  let airline = cleanText(airlineCell)?.toUpperCase().replace(/\s+/g, "") ?? null;
  let rest = numberText;
  if (!airline) {
    // Combined cell: designator (2 characters, or 3 letters) + number.
    const combined = numberText.match(/^([A-Z0-9]{2}|[A-Z]{3})(\d{1,4}[A-Z]?)$/);
    if (!combined || /^\d{2}$/.test(combined[1])) return null;
    [, airline, rest] = combined;
  }
  if (!/^([A-Z0-9]{2}|[A-Z]{3})$/.test(airline)) return null;
  const parts = rest.match(/^(\d{1,4})([A-Z]?)$/);
  if (!parts) return null;
  const suffix = parts[2] || (cleanText(suffixCell)?.toUpperCase() ?? "");
  if (!/^[A-Z]?$/.test(suffix)) return null;
  const number = String(Number.parseInt(parts[1], 10));
  return { airline, flightNumber: `${airline}${number}${suffix}` };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Excel day numbers count from 1899-12-30, which is right for every date after February 1900. */
function excelSerialToDate(serial: number): string {
  const utc = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000);
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}`;
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** "YYYY-MM-DD" when the day exists, e.g. not 31 April. */
function validDate(year: number, month: number, day: number): string | null {
  const text = `${year}-${pad(month)}-${pad(day)}`;
  return parseLocalDate(text) ? text : null;
}

/**
 * A calendar date as "YYYY-MM-DD": an Excel day number, "2024-09-10",
 * "10/SEP/2024" (or "10SEP24"), "10.09.2024" or "10/09/2024" (day first).
 */
export function parseDate(cell: Cell): string | null {
  if (isBlank(cell)) return null;
  if (typeof cell === "number") return cell >= 1 ? excelSerialToDate(cell) : null;
  const text = String(cell).trim().toUpperCase();
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/);
  if (match) return validDate(+match[1], +match[2], +match[3]);
  match = text.match(/^(\d{1,2})[\/\-. ]?([A-Z]{3})[\/\-. ]?(\d{2}|\d{4})$/);
  if (match) {
    const month = MONTHS.indexOf(match[2]) + 1;
    const year = match[3].length === 2 ? 2000 + +match[3] : +match[3];
    return month ? validDate(year, month, +match[1]) : null;
  }
  match = text.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})\.?$/);
  if (match) return validDate(+match[3], +match[2], +match[1]);
  if (/^\d+(\.\d+)?$/.test(text)) return parseDate(Number(text));
  return null;
}

/**
 * Minutes after midnight: a day fraction (Excel, 0.3020833 → 07:15), "07:15",
 * "7:15:40" or "0715". A day fraction is rounded to the nearest minute, since it
 * stores a whole minute with a floating-point error; written seconds are cut off
 * (rule 10).
 */
export function parseTime(cell: Cell): number | null {
  if (isBlank(cell)) return null;
  if (typeof cell === "number") {
    const fraction = cell - Math.floor(cell);
    return Math.round(fraction * 1440) % 1440;
  }
  const text = String(cell).trim();
  const match = text.match(/^(\d{1,2}):?(\d{2})(?::\d{2})?$/);
  if (match) {
    const hours = +match[1];
    const minutes = +match[2];
    return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
  }
  if (/^0?\.\d+$/.test(text)) return parseTime(Number(text));
  return null;
}

/** Day shift of the arrival, e.g. NetLine's DD column: "+1", "-1", "1" or empty. */
export function parseDayOffset(cell: Cell): number | null {
  if (isBlank(cell)) return 0;
  if (typeof cell === "number") return Number.isInteger(cell) && Math.abs(cell) <= 3 ? cell : null;
  const match = String(cell).trim().match(/^([+-]?)(\d)$/);
  if (!match) return null;
  return (match[1] === "-" ? -1 : 1) * Number(match[2]);
}

export type TimeZone = "UTC" | "LOCAL";

/** A date, minutes after midnight and a day shift, as a UTC instant. LOCAL means Budapest time. */
export function combineDateTime(date: string, minutes: number, timeZone: TimeZone, dayOffset = 0): Date {
  const day = parseLocalDate(addDays(date, dayOffset))!;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return timeZone === "UTC"
    ? new Date(Date.UTC(day.year, day.month - 1, day.day, hour, minute))
    : localToUtc(day.year, day.month, day.day, hour, minute);
}

/** The longest period one row may span (a season is about seven months). */
export const MAX_PERIOD_DAYS = 400;

/**
 * Operating days of a pattern: seven places from Monday to Sunday, a place is
 * operated when it holds its own day number (".2....." = Tuesday,
 * "123.5.." = Monday, Tuesday, Wednesday, Friday). Null for a malformed pattern.
 */
export function parsePattern(cell: Cell): boolean[] | null {
  if (isBlank(cell)) return null;
  // A space marks a day off too, so a seven-character pattern is not trimmed.
  const raw = String(cell);
  const text = (raw.length === 7 ? raw : raw.trim()).replace(/\s/g, ".");
  if (text.length !== 7) return null;
  const days = [...text].map((char, index) => {
    if (char === ".") return false;
    return char === String(index + 1) ? true : null;
  });
  return days.some((day) => day === null) || !days.some(Boolean) ? null : (days as boolean[]);
}

/** 0 = Monday … 6 = Sunday. */
function weekday(date: string): number {
  const d = parseLocalDate(date)!;
  return (new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay() + 6) % 7;
}

/**
 * The operating dates between From and Till (both included) by the pattern,
 * limited to the import's date range when one is given. Null when the period
 * is backwards or too long.
 */
export function expandPeriod(
  from: string,
  till: string,
  days: readonly boolean[],
  range?: { start: string; end: string },
): string[] | null {
  if (till < from) return null;
  const span = Math.round(
    (Date.parse(`${till}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
  );
  if (span > MAX_PERIOD_DAYS) return null;
  const start = range && range.start > from ? range.start : from;
  const end = range && range.end < till ? range.end : till;
  const dates: string[] = [];
  for (let date = start; date <= end; date = addDays(date, 1)) {
    if (days[weekday(date)]) dates.push(date);
  }
  return dates;
}

/**
 * A date and a time from one cell: an Excel day number with a fraction
 * (45545.302 → 2024-09-10 07:15) or text such as "2024-09-10 07:15" and
 * "10/SEP/2024 07:15".
 */
export function parseDateTime(cell: Cell): { date: string; minutes: number } | null {
  if (isBlank(cell)) return null;
  if (typeof cell === "number") {
    const date = parseDate(cell);
    const minutes = parseTime(cell);
    return date && minutes !== null ? { date, minutes } : null;
  }
  const match = String(cell).trim().match(/^(.+?)[T ](\d{1,2}:\d{2}(?::\d{2})?)$/);
  if (!match) return null;
  const date = parseDate(match[1]);
  const minutes = parseTime(match[2]);
  return date && minutes !== null ? { date, minutes } : null;
}
