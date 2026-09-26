import { describe, expect, it } from "vitest";
import { checkLdm, compareLdmCpm, compareUcmCpm } from "@/lib/telex/checks";
import type { CpmData } from "@/lib/telex/cpm";
import { messageEffects } from "@/lib/telex/effects";
import type { LdmData } from "@/lib/telex/ldm";
import { matchMessage, type MatchFlight } from "@/lib/telex/match";
import { parseMessage, type ParsedMessage } from "@/lib/telex/parse";
import { isSupported, splitMessages, type SupportedType } from "@/lib/telex/split";
import type { UcmData } from "@/lib/telex/ucm";
import { toLocalDate } from "@/lib/time";
import { buildSeedFlights, type SeedFlight } from "./seed-data";
import { buildSeedMessages, SEED_ADDRESSES } from "./seed-messages";

const AIRLINES = [{ id: "zz", code: "ZZ" }];

function matchFlights(flights: SeedFlight[]): MatchFlight[] {
  return flights.map((f, i) => ({
    id: f.inboundFlightNumber ?? f.outboundFlightNumber ?? String(i),
    airlineId: "zz",
    inboundFlightNumber: f.inboundFlightNumber,
    outboundFlightNumber: f.outboundFlightNumber,
    arrivalFlightDate: f.sta ? toLocalDate(f.sta) : null,
    departureFlightDate: f.std ? toLocalDate(f.std) : null,
    origin: null,
    destination: null,
    arrivalRegistration: null,
    departureRegistration: null,
  }));
}

function parse(text: string): ParsedMessage | null {
  const [message] = splitMessages(text).messages;
  return isSupported(message.type) ? parseMessage(message as typeof message & { type: SupportedType }) : null;
}

// Winter time ends on 25 October 2026.
for (const date of ["2026-09-22", "2026-10-25", "2026-12-31"]) {
  describe(`demo messages on ${date}`, () => {
    const flights = buildSeedFlights(date);
    const seed = buildSeedMessages(flights);
    const parsed = seed.map((m) => parse(m.text));
    const matched = seed.map((m, i) => {
      const p = parsed[i];
      if (!p) return "unsupported";
      const result = matchMessage(p, m.receivedAt, AIRLINES, matchFlights(flights));
      return result.matched ? `${result.flightId} ${result.key.part}` : result.reason;
    });

    it("parses every message without a warning", () => {
      expect(parsed.flatMap((p) => p?.warnings ?? [])).toEqual([]);
    });

    it("matches each to its flight part, and leaves the foreign one unmatched and the PTM unsupported", () => {
      expect(matched).toEqual([
        "ZZ1101 DEPARTURE_PART",
        "ZZ1101 DEPARTURE_PART",
        "ZZ1101 DEPARTURE_PART",
        "ZZ1203 ARRIVAL_PART",
        "ZZ1305 DEPARTURE_PART",
        "ZZ1305 DEPARTURE_PART",
        "ZZ1305 DEPARTURE_PART",
        "airline",
        "unsupported",
      ]);
    });

    it("gives ZZ1102 its ATD with a delay code that covers it, and ZZ1203 a later ETA", () => {
      const quick = flights.find((f) => f.outboundFlightNumber === "ZZ1102")!;
      const departure = messageEffects(parsed[0]!, "DEPARTURE_PART", {
        sta: quick.sta,
        std: quick.std,
        arrivalFlightDate: null,
        departureFlightDate: toLocalDate(quick.std!),
        arrivalCancelled: false,
        departureCancelled: false,
      });
      expect(departure.atd).toEqual(quick.atd);
      expect(departure.warnings).toEqual([]);
      const long = flights.find((f) => f.inboundFlightNumber === "ZZ1203")!;
      const arrival = messageEffects(parsed[3]!, "ARRIVAL_PART", {
        sta: long.sta,
        std: long.std,
        arrivalFlightDate: toLocalDate(long.sta!),
        departureFlightDate: null,
        arrivalCancelled: false,
        departureCancelled: false,
      });
      expect(arrival.eta).toEqual(new Date(long.sta!.getTime() + 25 * 60_000));
    });

    it("has a consistent load for ZZ1102 and the known UCM–CPM error for ZZ1306", () => {
      const data = <T,>(i: number) => parsed[i]!.data as T;
      expect(checkLdm(data<LdmData>(1))).toEqual([]);
      expect(compareLdmCpm(data<LdmData>(1), data<CpmData>(2))).toEqual([]);
      expect(compareLdmCpm(data<LdmData>(4), data<CpmData>(5))).toEqual([]);
      expect(compareUcmCpm(data<UcmData>(6), data<CpmData>(5)).map((w) => w.code)).toEqual([
        "ucmBaseNotInCpm",
        "cpmStackNotInUcm",
        "ucmEmptyInCpm",
      ]);
    });
  });
}

describe("the demo address book", () => {
  it("has only addresses that cannot be delivered", () => {
    for (const entry of SEED_ADDRESSES) {
      if (entry.channel === "EMAIL") expect(entry.address).toMatch(/@example\.invalid$/);
      else expect(entry.address).toMatch(/^[A-Z0-9]{7}$/);
    }
  });
});
