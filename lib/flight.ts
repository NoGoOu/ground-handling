import type { Timeline } from "@/lib/turnaround";

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

export interface Lateness {
  late: boolean;
  /** The original scheduled time of the late part, shown with its day. */
  scheduled: Date | null;
}

/**
 * "Késés és törlés": a flight is late when its effective arrival (the arrival
 * anchor) or its effective departure (ATD, else the departure anchor) is later
 * than scheduled. A cancelled part does not count.
 */
export function lateness(
  flight: { sta: Date | null; std: Date | null; arrivalCancelled?: boolean; departureCancelled?: boolean },
  timeline: Pick<Timeline, "arrivalAnchor" | "departureAnchor" | "effectiveAtd">,
): Lateness {
  const arrival = timeline.arrivalAnchor;
  if (flight.sta && !flight.arrivalCancelled && arrival && arrival.getTime() > flight.sta.getTime()) {
    return { late: true, scheduled: flight.sta };
  }
  const departure = timeline.effectiveAtd ?? timeline.departureAnchor;
  if (flight.std && !flight.departureCancelled && departure && departure.getTime() > flight.std.getTime()) {
    return { late: true, scheduled: flight.std };
  }
  return { late: false, scheduled: null };
}
