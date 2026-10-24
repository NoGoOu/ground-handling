import { normaliseFlightNumber } from "@/lib/import/transform";

// One snapshot of the AODB flight list (CLAUDE.md, "Közbeiktatva: valós
// járatok az Ikarus-mentésből", "A mentés formátuma"): a rolling window of the
// arrivals and departures, saved every half hour. Every time in it is UTC.
// Pure; the files are read in ./read.ts.

export type Direction = "ARRIVAL" | "DEPARTURE";

export interface Snapshot {
  /** When it was taken, from the file name. */
  takenAt: Date;
  /** The records as they are in the file; each is checked on its own. */
  arrivals: readonly unknown[];
  departures: readonly unknown[];
}

export type SnapshotError = "json" | "shape";

/** A file's text (with or without a byte order mark) as a snapshot. */
export function parseSnapshot(text: string, takenAt: Date): { ok: true; snapshot: Snapshot } | { ok: false; error: SnapshotError } {
  let json: unknown;
  try {
    json = JSON.parse(text.replace(/^﻿/, ""));
  } catch {
    return { ok: false, error: "json" };
  }
  const data = (json as { data?: { arrivalFlights?: unknown; departureFlights?: unknown } } | null)?.data;
  if (!data || !Array.isArray(data.arrivalFlights) || !Array.isArray(data.departureFlights)) return { ok: false, error: "shape" };
  return { ok: true, snapshot: { takenAt, arrivals: data.arrivalFlights, departures: data.departureFlights } };
}

/** The fields of a record the import uses, read and normalised. */
export interface SnapshotRecord {
  aodbId: number;
  airline: string;
  /** Normalised like the schedule import: "QQ0042" → "QQ42". */
  flightNumber: string;
  /** The other airport (IATA). */
  route: string | null;
  scheduled: Date;
  /** "hh:mm" with its day resolved; null when empty or unreadable. */
  estimated: Date | null;
  actual: Date | null;
  stand: string | null;
  /** Without dash or space, e.g. "XX-ABC" → "XXABC". */
  registration: string | null;
  aircraftType: string | null;
}

/** Why a record, or a time of it, could not be read. */
export type RecordError = "id" | "flightNumber" | "scheduledTime" | "estimatedTime" | "actualTime";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** "01.10.2026 07:20" (UTC) as an instant; null when not that or no such day. */
export function parseScheduled(text: unknown): Date | null {
  const match = typeof text === "string" ? text.trim().match(/^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/) : null;
  if (!match) return null;
  const [day, month, year, hour, minute] = match.slice(1).map(Number);
  if (hour > 23 || minute > 59) return null;
  const instant = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return instant.getUTCDate() === day && instant.getUTCMonth() === month - 1 ? instant : null;
}

/**
 * A time without a day ("hh:mm", UTC) on the day that puts it nearest to the
 * scheduled time (rule 51), e.g. 00:10 of a flight scheduled for 23:50 is the
 * next day. Exactly twelve hours either way: the later one.
 */
export function nearestTime(text: string, scheduled: Date): Date | null {
  const match = text.trim().match(/^(\d{2}):(\d{2})$/);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
  const sameDay =
    Date.UTC(scheduled.getUTCFullYear(), scheduled.getUTCMonth(), scheduled.getUTCDate()) +
    (Number(match[1]) * 60 + Number(match[2])) * MINUTE;
  const best = [sameDay - DAY, sameDay, sameDay + DAY].reduce((a, b) =>
    Math.abs(b - scheduled.getTime()) <= Math.abs(a - scheduled.getTime()) ? b : a,
  );
  return new Date(best);
}

const text = (value: unknown): string | null => (typeof value === "string" && value.trim() !== "" ? value.trim() : null);

/**
 * One record of a snapshot. Without a readable id, flight number or scheduled
 * time it is left out; an unreadable estimated or actual time is left empty,
 * with the error.
 */
export function readRecord(raw: unknown): { ok: true; record: SnapshotRecord; errors: RecordError[] } | { ok: false; error: RecordError; aodbId: number | null } {
  const fields = (raw ?? {}) as Record<string, unknown>;
  const aodbId = typeof fields.id === "number" && Number.isSafeInteger(fields.id) && fields.id > 0 ? fields.id : null;
  if (aodbId === null) return { ok: false, error: "id", aodbId: null };
  const number = normaliseFlightNumber(null, text(fields.flightNumber));
  if (!number) return { ok: false, error: "flightNumber", aodbId };
  const scheduled = parseScheduled(fields.scheduledTime);
  if (!scheduled) return { ok: false, error: "scheduledTime", aodbId };

  const errors: RecordError[] = [];
  const timeOf = (value: unknown, error: RecordError): Date | null => {
    const given = text(value);
    if (!given) return null;
    const instant = nearestTime(given, scheduled);
    if (!instant) errors.push(error);
    return instant;
  };
  return {
    ok: true,
    errors,
    record: {
      aodbId,
      airline: number.airline,
      flightNumber: number.flightNumber,
      route: text(fields.route)?.toUpperCase() ?? null,
      scheduled,
      estimated: timeOf(fields.estimatedTime, "estimatedTime"),
      actual: timeOf(fields.actualTime, "actualTime"),
      stand: text(fields.standExt),
      registration: text(fields.registration)?.toUpperCase().replace(/[\s-]/g, "") || null,
      aircraftType: text(fields.aircraftTypeIata)?.toUpperCase() ?? null,
    },
  };
}
