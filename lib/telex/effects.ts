import { delayMinutes } from "@/lib/turnaround";
import { resolveDayTime } from "./day-time";
import { checkCpm, checkDelays, checkLdm } from "./checks";
import { HOME_STATION, type Part } from "./match";
import type { ParsedMessage } from "./parse";
import { warn, type TelexWarning } from "./warnings";

// What a matched message does to its flight (CLAUDE.md, 7. mérföldkő, "Hatás
// a járatra"): the BUD departure MVT gives the ATD and the delay codes, the
// BUD arrival MVT the ATA, another station's MVT with EA for BUD the ETA.
// LDM, CPM and UCM only feed the flight part's infographic. Pure: the data
// layer applies the result.

/** The version kind (docs/messages.md, "Verziók"): AD, AA or EA for an MVT, IN or OUT for an UCM, else the type. */
export function versionKind(message: ParsedMessage): string {
  if (message.type === "MVT") {
    const { station, departure, arrival } = message.data;
    if (station === HOME_STATION && departure) return "AD";
    if (station === HOME_STATION && arrival) return "AA";
    return "EA";
  }
  if (message.type === "UCM") return message.data.direction ?? "UCM";
  return message.type;
}

export const versionKey = (flightId: string, part: Part, type: string, kind: string) =>
  `${flightId}|${part}|${type}|${kind}`;

export interface EffectFlight {
  sta: Date | null;
  std: Date | null;
  /** "YYYY-MM-DD" */
  arrivalFlightDate: string | null;
  departureFlightDate: string | null;
  arrivalCancelled: boolean;
  departureCancelled: boolean;
}

/** The instants of the message's times, resolved against the flight. */
export interface ResolvedTimes {
  offBlock?: Date;
  airborne?: Date;
  touchdown?: Date;
  onBlock?: Date;
  estimatedArrival?: Date;
}

export interface Effects {
  times: ResolvedTimes;
  atd?: Date;
  ata?: Date;
  eta?: Date;
  /** Replace the message-made delay records of the flight with these. */
  delays?: { code: string; minutes: number }[];
  warnings: TelexWarning[];
}

const midnight = (day: string | null) => (day ? new Date(`${day}T00:00:00Z`) : null);

/**
 * The times of a message resolved against the flight: a day nearest to the
 * scheduled time (the ATD of the ET 3365/12 is on the 17th), a time without a
 * day at or after the previous one.
 */
export function resolveTimes(message: ParsedMessage, part: Part, flight: EffectFlight): ResolvedTimes {
  if (message.type !== "MVT") return {};
  const { departure, arrival, estimatedArrival } = message.data;
  const scheduled =
    (part === "DEPARTURE_PART" ? flight.std : flight.sta) ??
    midnight(part === "DEPARTURE_PART" ? flight.departureFlightDate : flight.arrivalFlightDate) ??
    new Date(0);
  const times: ResolvedTimes = {};
  // Another station's departure happens on the operating day, before our arrival.
  const departureReference = message.data.station === HOME_STATION ? scheduled : (midnight(flight.arrivalFlightDate) ?? scheduled);
  if (departure) {
    times.offBlock = resolveDayTime(departure.offBlock, departureReference);
    if (departure.airborne) times.airborne = resolveDayTime(departure.airborne, times.offBlock);
  }
  if (arrival) {
    const touchdown = arrival.touchdown ? resolveDayTime(arrival.touchdown, scheduled) : null;
    if (touchdown) times.touchdown = touchdown;
    times.onBlock = resolveDayTime(arrival.onBlock, touchdown ?? scheduled);
  }
  if (estimatedArrival) {
    times.estimatedArrival = resolveDayTime(estimatedArrival.time, times.airborne ?? times.offBlock ?? scheduled);
  }
  return times;
}

/** What the message changes on its flight part, with the checks of the message itself. */
export function messageEffects(message: ParsedMessage, part: Part, flight: EffectFlight): Effects {
  const times = resolveTimes(message, part, flight);
  const warnings: TelexWarning[] = [];
  if (message.type === "LDM") warnings.push(...checkLdm(message.data));
  if (message.type === "CPM") warnings.push(...checkCpm(message.data));
  // Rule 17: nothing is recorded on a cancelled part.
  const cancelled = part === "ARRIVAL_PART" ? flight.arrivalCancelled : flight.departureCancelled;
  if (message.type !== "MVT") return { times, warnings };
  if (cancelled) return { times, warnings: [...warnings, warn("partCancelled")] };

  const effects: Effects = { times, warnings };
  const kind = versionKind(message);
  if (kind === "AD" && part === "DEPARTURE_PART" && times.offBlock) {
    effects.atd = times.offBlock;
    effects.delays = message.data.delays.flatMap((d) => (d.minutes === null ? [] : [{ code: d.code, minutes: d.minutes }]));
    // Rule 7 with the ATD of this message.
    warnings.push(...checkDelays(message.data.delays, delayMinutes(flight.std, times.offBlock)));
  } else if (kind === "AA" && part === "ARRIVAL_PART" && times.onBlock) {
    effects.ata = times.onBlock;
  } else if (kind === "EA" && part === "ARRIVAL_PART" && times.estimatedArrival) {
    effects.eta = times.estimatedArrival;
  }
  return effects;
}
