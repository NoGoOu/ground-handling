// Small display helpers for a flight.

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
