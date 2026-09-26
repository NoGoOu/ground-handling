// The header line of a message (docs/messages.md, "Általános szabályok"):
// "flight/date.registration" and then fields that differ by type, e.g.
// "P75535/16.URNPA.BUD" or "CZ2557/19SEP26.B2041.4/1.CANBUD".

export interface Header {
  /** As written, e.g. "P75535"; the airline code is split off by the known airlines. */
  flightNumber: string;
  /** "16" or "19SEP26", as written. */
  dateText: string;
  /** Day of the month only, or a full date "YYYY-MM-DD". */
  date: { day: number } | { date: string };
  registration: string | null;
  /** The fields after the registration, split at the dots. */
  fields: string[];
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/**
 * A flight designator: airline code (2 characters, not both digits, or 3
 * letters), 1–4 digits, an optional suffix.
 */
export const FLIGHT_DESIGNATOR = /^(?:[A-Z][A-Z0-9]|[0-9][A-Z]|[A-Z]{3})\d{1,4}[A-Z]?$/;

/** "16" → { day: 16 }; "19SEP26" → { date: "2026-09-19" }; null when neither. */
export function parseHeaderDate(text: string): Header["date"] | null {
  const dayOnly = text.match(/^(\d{1,2})$/);
  if (dayOnly) {
    const day = Number(dayOnly[1]);
    return day >= 1 && day <= 31 ? { day } : null;
  }
  const full = text.match(/^(\d{1,2})([A-Z]{3})(\d{2})$/);
  if (!full) return null;
  const month = MONTHS.indexOf(full[2]) + 1;
  const day = Number(full[1]);
  const year = 2000 + Number(full[3]);
  if (month === 0 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;
  return { date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` };
}

/** The header of a message, or null when the line is not one. */
export function parseHeader(line: string): Header | null {
  const match = line.trim().toUpperCase().match(/^([A-Z0-9]+)\/([0-9A-Z]+)(?:\.(.*))?$/);
  if (!match || !FLIGHT_DESIGNATOR.test(match[1])) return null;
  const date = parseHeaderDate(match[2]);
  if (!date) return null;
  const [registration, ...fields] = (match[3] ?? "").split(".").map((field) => field.trim());
  return {
    flightNumber: match[1],
    dateText: match[2],
    date,
    registration: registration && !isNil(registration) ? registration : null,
    fields: fields.filter((field) => field !== ""),
  };
}

/** The "none" of the messages: "N", "NIL", with or without a leading dot or slash. */
export function isNil(token: string): boolean {
  return /^[./]?(N|NIL)$/.test(token.trim().toUpperCase());
}

/** The lines of a message after its type line, without the empty ones. */
export function bodyLines(lines: readonly string[]): string[] {
  return lines.slice(1).filter((line) => line.trim() !== "");
}
