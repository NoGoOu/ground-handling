import type { Leg } from "@/lib/import/mapping";
import { HOME_STATION, inRange, type ImportedTurnaround } from "@/lib/import/pairing";
import { toLocalDate } from "@/lib/time";
import type { IkarusLeg } from "./merge";
import { pairByRegistration, type IkarusTurnaround, type UnpairedReason } from "./pairing";

// From the merged AODB legs to what the import writes (CLAUDE.md,
// "Közbeiktatva: valós járatok az Ikarus-mentésből", "Mit ír a járatra").
// The schedule part goes through the schedule import's dry run and save
// (lib/import/diff.ts, lib/data/imports.ts); the rest, the stand, the
// estimates and actuals and the AODB ids, is worked out here. Pure.

/** The import profile its flights and its runs in the import log carry. */
export const IKARUS_PROFILE = "Ikarus";

/**
 * The same flight under two AODB ids (same direction, flight number, Budapest
 * day and route) would be one flight twice: the one seen last stays.
 */
export function withoutDuplicates(legs: readonly IkarusLeg[]): { legs: IkarusLeg[]; duplicates: number } {
  const byKey = new Map<string, IkarusLeg>();
  for (const leg of legs) {
    const key = `${leg.direction}|${leg.flightNumber}|${toLocalDate(leg.scheduled)}|${leg.route}`;
    const other = byKey.get(key);
    if (!other || +leg.lastSeen > +other.lastSeen || (+leg.lastSeen === +other.lastSeen && leg.aodbId > other.aodbId)) {
      byKey.set(key, leg);
    }
  }
  const kept = new Set(byKey.values());
  return { legs: legs.filter((leg) => kept.has(leg)), duplicates: legs.length - kept.size };
}

/**
 * A leg as the schedule import knows it. The backup gives the time at
 * Budapest only, so the other end's time is the same instant (never used),
 * and the operating day is the Budapest day of the scheduled time: exact for
 * a departure, and for an arrival as for a flight typed in by hand (rule 42).
 */
export function toLeg(leg: IkarusLeg): Leg {
  const arriving = leg.direction === "ARRIVAL";
  return {
    row: 0,
    airline: leg.airline,
    flightNumber: leg.flightNumber,
    origin: arriving ? leg.route : HOME_STATION,
    destination: arriving ? HOME_STATION : leg.route,
    flightDate: toLocalDate(leg.scheduled),
    std: leg.scheduled,
    sta: leg.scheduled,
    aircraftType: leg.aircraftType,
    aircraftConfig: null,
    registration: leg.registration,
    next: null,
    aodbId: leg.aodbId,
  };
}

export function toImported(turnaround: IkarusTurnaround): ImportedTurnaround {
  return {
    kind: turnaround.kind,
    airline: turnaround.airline,
    arrival: turnaround.arrival && toLeg(turnaround.arrival),
    departure: turnaround.departure && toLeg(turnaround.departure),
  };
}

export interface IkarusPlan {
  /** The turnarounds touching the range, each with its form for the schedule import. */
  turnarounds: { ikarus: IkarusTurnaround; imported: ImportedTurnaround }[];
  duplicates: number;
  unpaired: Record<UnpairedReason, number>;
}

/**
 * The legs, without duplicates, paired by registration; of the turnarounds
 * those whose arrival or departure falls on a Budapest day of the range. The
 * legs should be read with a margin around the range, so a turnaround across
 * its edge still pairs.
 */
export function planIkarus(legs: readonly IkarusLeg[], range: { start: string; end: string }): IkarusPlan {
  const { legs: unique, duplicates } = withoutDuplicates(legs);
  const pairing = pairByRegistration(unique);
  const turnarounds = pairing.turnarounds
    .map((ikarus) => ({ ikarus, imported: toImported(ikarus) }))
    .filter(({ imported }) => inRange(imported, range));
  return { turnarounds, duplicates, unpaired: pairing.unpaired };
}

/** What a flight has now of the fields the Ikarus import writes. */
export interface LiveState {
  stand: string | null;
  eta: Date | null;
  etaSource: "MANUAL" | "MESSAGE" | "IKARUS" | null;
  etaRecordedAt: Date | null;
  etd: Date | null;
  etdSource: "MANUAL" | "MESSAGE" | "IKARUS" | null;
  etdRecordedAt: Date | null;
  ata: Date | null;
  atd: Date | null;
  arrivalAodbId: number | null;
  departureAodbId: number | null;
  /** A message gave the ATA or the ATD (a log entry says so): that one stays. */
  arrivalActualFromMessage: boolean;
  departureActualFromMessage: boolean;
}

export interface LiveData {
  stand?: string;
  eta?: Date | null;
  etaSource?: "IKARUS" | null;
  etaNote?: null;
  etaRecordedById?: null;
  etaRecordedAt?: Date | null;
  etd?: Date | null;
  etdSource?: "IKARUS" | null;
  etdNote?: null;
  etdRecordedById?: null;
  etdRecordedAt?: Date | null;
  ata?: Date;
  atd?: Date;
  arrivalAodbId: number | null;
  departureAodbId: number | null;
}

type EstimateFields = Pick<LiveData, "eta" | "etaSource" | "etaNote" | "etaRecordedById" | "etaRecordedAt">;

/**
 * An estimate from the backup, as of the last snapshot the leg was in. The
 * latest estimate counts ("Késés és törlés"): Ikarus does not overwrite a
 * later one given by hand or by a message. When the backup no longer has an
 * estimate, one that came from it goes; any other stays.
 */
function estimate(
  leg: IkarusLeg,
  current: { source: LiveState["etaSource"]; recordedAt: Date | null } | null,
): EstimateFields {
  const ours = !current || current.source === null || current.source === "IKARUS";
  const older = !current?.recordedAt || +current.recordedAt < +leg.lastSeen;
  if (!ours && !older) return {};
  if (leg.estimated) {
    return { eta: leg.estimated, etaSource: "IKARUS", etaNote: null, etaRecordedById: null, etaRecordedAt: leg.lastSeen };
  }
  if (current?.source === "IKARUS") return { eta: null, etaSource: null, etaNote: null, etaRecordedById: null, etaRecordedAt: null };
  return {};
}

/**
 * The Ikarus fields of a turnaround's flight, given what the flight has now
 * (null for a new flight). The stand is the last one given (the departure's,
 * else the arrival's), and an empty one leaves the flight's. The actual
 * times are the system's values (rule 9), unless a message gave one.
 */
export function liveData(turnaround: IkarusTurnaround, current: LiveState | null): LiveData {
  const { arrival, departure } = turnaround;
  const data: LiveData = { arrivalAodbId: arrival?.aodbId ?? null, departureAodbId: departure?.aodbId ?? null };
  const stand = departure?.stand ?? arrival?.stand ?? null;
  if (stand) data.stand = stand;
  if (arrival) {
    Object.assign(data, estimate(arrival, current && { source: current.etaSource, recordedAt: current.etaRecordedAt }));
    if (arrival.actual && !current?.arrivalActualFromMessage) data.ata = arrival.actual;
  }
  if (departure) {
    const fields = estimate(departure, current && { source: current.etdSource, recordedAt: current.etdRecordedAt });
    if ("eta" in fields) {
      Object.assign(data, {
        etd: fields.eta,
        etdSource: fields.etaSource,
        etdNote: fields.etaNote,
        etdRecordedById: fields.etaRecordedById,
        etdRecordedAt: fields.etaRecordedAt,
      });
    }
    if (departure.actual && !current?.departureActualFromMessage) data.atd = departure.actual;
  }
  return data;
}

/** The fields of the data that differ from the flight now (the note and the recorder go with the estimate). */
export function liveChanges(data: LiveData, current: LiveState): string[] {
  const same = (a: unknown, b: unknown) => (a instanceof Date && b instanceof Date ? +a === +b : a === b);
  const given = data as unknown as Record<string, unknown>;
  const now = current as unknown as Record<string, unknown>;
  return Object.keys(given).filter((key) => key in now && !same(given[key], now[key]));
}
