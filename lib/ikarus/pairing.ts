import type { FlightKind } from "@/lib/turnaround";
import type { IkarusLeg } from "./merge";

// Turnarounds by registration (CLAUDE.md, "Közbeiktatva: valós járatok az
// Ikarus-mentésből", "Fordulók lajstrom alapján"). The backup has no next
// flight, so an arrival is paired with the first departure of the same
// aircraft after it, within a day, that no earlier arrival took. One more
// guard (approved with the plan): the departure must come before the
// aircraft's next arrival, since by then it has left. So a departure missing
// from the backup does not make an arrival take the departure of the
// aircraft's next turnaround. What does not pair stays one-sided (rule 11).

/** The longest time on the ground of a turnaround (placeholder). */
export const MAX_GROUND_MINUTES = 24 * 60;

export interface IkarusTurnaround {
  kind: FlightKind;
  /** The arrival's airline on a turnaround, as with the schedule import. */
  airline: string;
  arrival: IkarusLeg | null;
  departure: IkarusLeg | null;
}

/** Why an arrival stays arrival-only. */
export type UnpairedReason = "noRegistration" | "noDeparture";

export interface IkarusPairing {
  /** In the order of their first time. */
  turnarounds: IkarusTurnaround[];
  /** Arrival-only flights by reason; departures without a registration are counted apart. */
  unpaired: Record<UnpairedReason, number>;
  departuresWithoutRegistration: number;
}

const MINUTE = 60_000;

export function pairByRegistration(legs: readonly IkarusLeg[], maxGroundMinutes = MAX_GROUND_MINUTES): IkarusPairing {
  const byTime = (a: IkarusLeg, b: IkarusLeg) => +a.scheduled - +b.scheduled || a.aodbId - b.aodbId;
  const arrivals = legs.filter((leg) => leg.direction === "ARRIVAL").sort(byTime);
  const departures = legs.filter((leg) => leg.direction === "DEPARTURE").sort(byTime);

  const group = (list: IkarusLeg[]) => {
    const map = new Map<string, IkarusLeg[]>();
    for (const leg of list) {
      if (!leg.registration) continue;
      const own = map.get(leg.registration);
      if (own) own.push(leg);
      else map.set(leg.registration, [leg]);
    }
    return map;
  };
  const arrivalsByAircraft = group(arrivals);
  const departuresByAircraft = group(departures);

  const taken = new Set<IkarusLeg>();
  const unpaired: Record<UnpairedReason, number> = { noRegistration: 0, noDeparture: 0 };
  const turnarounds: IkarusTurnaround[] = [];
  for (const arrival of arrivals) {
    let departure: IkarusLeg | null = null;
    if (!arrival.registration) unpaired.noRegistration++;
    else {
      const own = arrivalsByAircraft.get(arrival.registration)!;
      const nextArrival = own[own.indexOf(arrival) + 1] ?? null;
      const latest = +arrival.scheduled + maxGroundMinutes * MINUTE;
      departure =
        departuresByAircraft
          .get(arrival.registration)
          ?.find(
            (leg) =>
              !taken.has(leg) &&
              +leg.scheduled > +arrival.scheduled &&
              +leg.scheduled <= latest &&
              (!nextArrival || +leg.scheduled < +nextArrival.scheduled),
          ) ?? null;
      if (!departure) unpaired.noDeparture++;
    }
    if (departure) taken.add(departure);
    turnarounds.push({ kind: departure ? "TURNAROUND" : "ARRIVAL_ONLY", airline: arrival.airline, arrival, departure });
  }
  for (const departure of departures) {
    if (!taken.has(departure)) turnarounds.push({ kind: "DEPARTURE_ONLY", airline: departure.airline, arrival: null, departure });
  }
  const first = (t: IkarusTurnaround) => +(t.arrival ?? t.departure)!.scheduled;
  turnarounds.sort((a, b) => first(a) - first(b));
  return {
    turnarounds,
    unpaired,
    departuresWithoutRegistration: departures.filter((leg) => !leg.registration).length,
  };
}

/** Paired, arrival-only and departure-only turnarounds. */
export function pairingCounts(turnarounds: readonly IkarusTurnaround[]): Record<FlightKind, number> {
  const counts: Record<FlightKind, number> = { TURNAROUND: 0, ARRIVAL_ONLY: 0, DEPARTURE_ONLY: 0 };
  for (const turnaround of turnarounds) counts[turnaround.kind]++;
  return counts;
}
