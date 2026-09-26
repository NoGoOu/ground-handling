import { resolveOperatingDay } from "./day-time";
import type { ParsedMessage } from "./parse";
import { warn, type TelexWarning } from "./warnings";

// Matching a message to a flight part (docs/messages.md, "Párosítás és a
// járat része"): flight number (the airline code split off by the airlines we
// know) + operating day + station. Pure: the data layer passes the airlines
// and the candidate flights.

export const HOME_STATION = "BUD";

export type Part = "ARRIVAL_PART" | "DEPARTURE_PART";

export interface MatchAirline {
  id: string;
  /** IATA code, e.g. "P7". */
  code: string;
}

export interface MatchFlight {
  id: string;
  airlineId: string;
  inboundFlightNumber: string | null;
  outboundFlightNumber: string | null;
  /** "YYYY-MM-DD" */
  arrivalFlightDate: string | null;
  departureFlightDate: string | null;
  origin: string | null;
  destination: string | null;
  arrivalRegistration: string | null;
  departureRegistration: string | null;
}

export type UnmatchedReason = "noHeader" | "airline" | "notHome" | "part" | "none" | "many";

/** What the matching could tell even without a flight. */
export interface MatchKey {
  airline: MatchAirline;
  /** As our flights store it: "P75535". */
  flightNumber: string;
  /** "YYYY-MM-DD" */
  operatingDay: string;
  part: Part | null;
}

export type MatchResult =
  | {
      matched: true;
      key: MatchKey & { part: Part };
      flightId: string;
      /** The registration to fill in when the flight part has none. */
      fillRegistration: string | null;
      warnings: TelexWarning[];
    }
  | { matched: false; reason: UnmatchedReason; key: MatchKey | null; warnings: TelexWarning[] };

/** "P75535" with P7 known → P7 + "P75535"; leading zeros go, as with our flight numbers. */
export function splitFlightNumber(
  flightNumber: string,
  airlines: readonly MatchAirline[],
): { airline: MatchAirline; flightNumber: string } | null {
  const found = airlines.flatMap((airline) => {
    if (!flightNumber.startsWith(airline.code)) return [];
    const rest = flightNumber.slice(airline.code.length).match(/^(\d{1,4})([A-Z]?)$/);
    return rest ? [{ airline, flightNumber: `${airline.code}${Number(rest[1])}${rest[2]}` }] : [];
  });
  // A 3-letter code and a 2-character one could both fit: then it is not clear.
  return found.length === 1 ? found[0] : null;
}

/** The flight part a message is about, or why it cannot tell. */
export function partOf(
  message: ParsedMessage,
  departsFromHome: (flightNumber: string) => boolean,
  flightNumber: string,
): Part | "notHome" | "part" {
  switch (message.type) {
    case "MVT": {
      const { station, departure, arrival, estimatedArrival } = message.data;
      if (station === HOME_STATION) return departure ? "DEPARTURE_PART" : arrival ? "ARRIVAL_PART" : "part";
      // Another station's MVT concerns us when its EA is for BUD: the ETA.
      return estimatedArrival?.destination === HOME_STATION ? "ARRIVAL_PART" : "notHome";
    }
    case "UCM": {
      if (message.data.station !== HOME_STATION) return "notHome";
      return message.data.direction === "IN" ? "ARRIVAL_PART" : message.data.direction === "OUT" ? "DEPARTURE_PART" : "part";
    }
    case "LDM": {
      if (message.data.legs.some((leg) => leg.destination === HOME_STATION)) return "ARRIVAL_PART";
      return departsFromHome(flightNumber) ? "DEPARTURE_PART" : "notHome";
    }
    case "CPM": {
      const { from, to, positions } = message.data;
      if (to === HOME_STATION) return "ARRIVAL_PART";
      if (from === HOME_STATION) return "DEPARTURE_PART";
      if (!from && !to && positions.some((p) => p.destination === HOME_STATION)) return "ARRIVAL_PART";
      return "notHome";
    }
  }
}

/** The station of the other end the message names, to narrow the candidates. */
function otherEnd(message: ParsedMessage, part: Part): string | null {
  if (message.type === "MVT") {
    if (part === "ARRIVAL_PART") return message.data.station !== HOME_STATION ? message.data.station : null;
    return message.data.estimatedArrival?.destination ?? null;
  }
  if (message.type === "CPM") return part === "ARRIVAL_PART" ? message.data.from : message.data.to;
  if (message.type === "LDM" && part === "DEPARTURE_PART") return message.data.legs[0]?.destination ?? null;
  return null;
}

export function matchMessage(
  message: ParsedMessage,
  receivedAt: Date,
  airlines: readonly MatchAirline[],
  flights: readonly MatchFlight[],
): MatchResult {
  const warnings: TelexWarning[] = [];
  const header = message.header;
  if (!header) return { matched: false, reason: "noHeader", key: null, warnings };
  const split = splitFlightNumber(header.flightNumber, airlines);
  if (!split) return { matched: false, reason: "airline", key: null, warnings };
  const operatingDay = "date" in header.date ? header.date.date : resolveOperatingDay(header.date.day, receivedAt);
  const own = flights.filter((f) => f.airlineId === split.airline.id);
  const departs = (flightNumber: string) =>
    own.some((f) => f.outboundFlightNumber === flightNumber && f.departureFlightDate === operatingDay);

  const part = partOf(message, departs, split.flightNumber);
  const key: MatchKey = { airline: split.airline, flightNumber: split.flightNumber, operatingDay, part: null };
  if (part === "notHome" || part === "part") return { matched: false, reason: part, key, warnings };

  const end = otherEnd(message, part);
  const candidates = own.filter((f) =>
    part === "ARRIVAL_PART"
      ? f.inboundFlightNumber === split.flightNumber &&
        f.arrivalFlightDate === operatingDay &&
        (!end || !f.origin || f.origin === end)
      : f.outboundFlightNumber === split.flightNumber &&
        f.departureFlightDate === operatingDay &&
        (!end || !f.destination || f.destination === end),
  );
  const partKey = { ...key, part };
  if (candidates.length !== 1) {
    return { matched: false, reason: candidates.length === 0 ? "none" : "many", key: partKey, warnings };
  }

  // The registration is secondary: filled in when missing, a warning when it differs.
  const flight = candidates[0];
  const current = part === "ARRIVAL_PART" ? flight.arrivalRegistration : flight.departureRegistration;
  const registration = header.registration;
  if (registration && current && registration !== current) {
    warnings.push(warn("registrationMismatch", { flight: current, message: registration }));
  }
  return {
    matched: true,
    key: partKey,
    flightId: flight.id,
    fillRegistration: registration && !current ? registration : null,
    warnings,
  };
}
