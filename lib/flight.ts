import { diffMinutes, type Timeline } from "@/lib/turnaround";

// Small display rules for a flight.

export interface FlightNumbers {
  /** Null on a departure-only flight (rule 11). */
  inboundFlightNumber: string | null;
  /** Null on an arrival-only flight (rule 11). */
  outboundFlightNumber: string | null;
}

/** "ZZ1101 / ZZ1102", or the one flight number of a one-sided flight. */
export function flightLabel(flight: FlightNumbers): string {
  return [flight.inboundFlightNumber, flight.outboundFlightNumber].filter(Boolean).join(" / ");
}

/** "HA-LYA" → "HALYA": registrations are compared without separators, as messages write them. */
export function normaliseRegistration(value: string | null | undefined): string | null {
  const cleaned = (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleaned || null;
}

export interface Lateness {
  late: boolean;
  /** The original scheduled time of the late part, shown with its day. */
  scheduled: Date | null;
}

/**
 * "Késés és törlés": a flight is late when its effective arrival (the arrival
 * anchor) or its effective departure (ATD, else the departure anchor) is later
 * than scheduled by more than the yellow deviation threshold (global setting,
 * 5 minutes by default). A cancelled part does not count.
 */
export function lateness(
  flight: { sta: Date | null; std: Date | null; arrivalCancelled?: boolean; departureCancelled?: boolean },
  timeline: Pick<Timeline, "arrivalAnchor" | "departureAnchor" | "effectiveAtd">,
  thresholdMinutes: number,
): Lateness {
  const lateBy = (effective: Date | null, scheduled: Date) =>
    !!effective && diffMinutes(effective, scheduled) > thresholdMinutes;

  if (flight.sta && !flight.arrivalCancelled && lateBy(timeline.arrivalAnchor, flight.sta)) {
    return { late: true, scheduled: flight.sta };
  }
  const departure = timeline.effectiveAtd ?? timeline.departureAnchor;
  if (flight.std && !flight.departureCancelled && lateBy(departure, flight.std)) {
    return { late: true, scheduled: flight.std };
  }
  return { late: false, scheduled: null };
}
