import { PROCESSED_SLOT_TITLES, type SlotData } from "./adexp";

// The slot of a flight's departure (CLAUDE.md, 8. mérföldkő, "Slotüzenetek"):
// the target off-block is CTOT − taxi time; a warning when the planned
// off-block is later than it plus the tolerance. The slot never changes the
// ETD. Pure.

export const HOME_ICAO = "LHBP";
/** How far the EOBT may be from the scheduled or estimated departure (placeholder). */
export const SLOT_MATCH_WINDOW_MINUTES = 120;

const MINUTE = 60_000;

/** "2026-09-27" + "1220" → the instant in UTC. */
function at(day: string, hhmm: string): Date {
  return new Date(`${day}T${hhmm.slice(0, 2)}:${hhmm.slice(2)}:00Z`);
}

export interface Slot {
  title: string;
  eobt: Date;
  /** The slot: the calculated take-off time. */
  ctot: Date;
  taxiMinutes: number;
  /** CTOT − taxi time. */
  targetOffBlock: Date;
  regulations: string[];
  cause: { reason: string; delayCode: string | null } | null;
}

/** The slot a SAM or SRM gives; null for another title or missing times. */
export function slotOf(data: SlotData): Slot | null {
  if (!PROCESSED_SLOT_TITLES.includes(data.title) || !data.eobd || !data.eobt || !data.ctot) return null;
  const eobt = at(data.eobd, data.eobt);
  let ctot = at(data.eobd, data.ctot);
  // A slot past midnight (UTC) falls on the next day.
  if (ctot.getTime() < eobt.getTime() - 12 * 60 * MINUTE) ctot = new Date(ctot.getTime() + 24 * 60 * MINUTE);
  const taxiMinutes = data.taxiMinutes ?? 0;
  return {
    title: data.title,
    eobt,
    ctot,
    taxiMinutes,
    targetOffBlock: new Date(ctot.getTime() - taxiMinutes * MINUTE),
    regulations: data.regulations,
    cause: data.cause,
  };
}

/** Minutes the planned off-block is later than the target off-block + tolerance; null when it is not. */
export function slotLateness(plannedOffBlock: Date | null, slot: Slot, toleranceMinutes: number): number | null {
  if (!plannedOffBlock) return null;
  const late = Math.round((plannedOffBlock.getTime() - slot.targetOffBlock.getTime()) / MINUTE);
  return late > toleranceMinutes ? late : null;
}

/** The delay the slot gives against the STD, with its code, to offer (e.g. 81). */
export function slotDelay(slot: Slot, std: Date | null): { code: string | null; minutes: number } | null {
  if (!std) return null;
  const minutes = Math.round((slot.targetOffBlock.getTime() - std.getTime()) / MINUTE);
  return minutes > 0 ? { code: slot.cause?.delayCode ?? null, minutes } : null;
}

export interface SlotFlight {
  id: string;
  /** "YYYY-MM-DD" */
  departureFlightDate: string | null;
  destination: string | null;
  std: Date | null;
  etd: Date | null;
  departureIfplid: string | null;
  departureCancelled: boolean;
}

export type SlotMatch =
  | { matched: true; flightId: string; byIfplid: boolean }
  | { matched: false; reason: "noHeader" | "notHome" | "noAirport" | "none" | "many" };

/**
 * A slot message's departure (docs/messages.md, "Párosítás"): by IFPLID when a
 * departure already has it; otherwise the BUD departure to ADES (ICAO → IATA
 * by the airport table) on EOBD whose scheduled or estimated off-block is
 * within two hours of EOBT. Exactly one, or it stays unmatched.
 */
export function matchSlot(
  data: SlotData,
  iataOf: (icao: string) => string | null,
  flights: readonly SlotFlight[],
): SlotMatch {
  if (!data.ifplid && !data.eobd) return { matched: false, reason: "noHeader" };
  const known = data.ifplid ? flights.find((f) => f.departureIfplid === data.ifplid) : undefined;
  if (known) return { matched: true, flightId: known.id, byIfplid: true };
  if (data.adep !== HOME_ICAO) return { matched: false, reason: "notHome" };
  const destination = data.ades ? iataOf(data.ades) : null;
  if (!destination) return { matched: false, reason: "noAirport" };
  if (!data.eobd || !data.eobt) return { matched: false, reason: "none" };
  const eobt = at(data.eobd, data.eobt).getTime();
  const candidates = flights.filter((f) => {
    const planned = f.etd ?? f.std;
    return (
      f.destination === destination &&
      f.departureFlightDate === data.eobd &&
      !!planned &&
      Math.abs(planned.getTime() - eobt) <= SLOT_MATCH_WINDOW_MINUTES * MINUTE
    );
  });
  if (candidates.length !== 1) return { matched: false, reason: candidates.length === 0 ? "none" : "many" };
  return { matched: true, flightId: candidates[0].id, byIfplid: false };
}

/** SAM and SRM of one flight plan are versions of each other; another title is kept apart. */
export const slotVersionKind = (data: SlotData) =>
  PROCESSED_SLOT_TITLES.includes(data.title) ? (data.ifplid ?? "SLOT") : `${data.title}:${data.ifplid ?? ""}`;

