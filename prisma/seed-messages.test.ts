import { describe, expect, it } from "vitest";
import { checkDelayDocument } from "@/lib/delay-document";
import { checkLdm, compareLdmCpm, compareUcmCpm } from "@/lib/telex/checks";
import type { CpmData } from "@/lib/telex/cpm";
import { messageEffects } from "@/lib/telex/effects";
import type { LdmData } from "@/lib/telex/ldm";
import { matchMessage, type MatchFlight } from "@/lib/telex/match";
import { parseMessage, type ParsedMessage } from "@/lib/telex/parse";
import { matchSlot, slotLateness, slotOf } from "@/lib/telex/slot";
import { isSupported, splitMessages } from "@/lib/telex/split";
import type { UcmData } from "@/lib/telex/ucm";
import { toLocalDate } from "@/lib/time";
import { buildSeedFlights, SEED_AIRLINE, type SeedFlight } from "./seed-data";
import {
  buildSeedMessages,
  SEED_ADDRESSES,
  SEED_AIRPORTS,
  SEED_DELAY_CODES,
  SEED_DELAY_DOCUMENT,
  seedDelayCodePdf,
} from "./seed-messages";

const AIRLINES = [{ id: "zz", code: "ZZ" }];

function matchFlights(flights: SeedFlight[]): MatchFlight[] {
  return flights.map((f, i) => ({
    id: f.inboundFlightNumber ?? f.outboundFlightNumber ?? String(i),
    airlineId: "zz",
    inboundFlightNumber: f.inboundFlightNumber,
    outboundFlightNumber: f.outboundFlightNumber,
    arrivalFlightDate: f.sta ? toLocalDate(f.sta) : null,
    departureFlightDate: f.std ? toLocalDate(f.std) : null,
    origin: f.origin,
    destination: f.destination,
    arrivalRegistration: null,
    departureRegistration: null,
  }));
}

function parse(text: string): ParsedMessage | null {
  const [message] = splitMessages(text).messages;
  return isSupported(message.type) || message.family === "ADEXP" ? parseMessage(message) : null;
}

const iataOf = (icao: string) => SEED_AIRPORTS.find((a) => a.icaoCode === icao)?.iataCode ?? null;

function slotFlights(flights: SeedFlight[]) {
  return flights.map((f, i) => ({
    id: f.inboundFlightNumber ?? f.outboundFlightNumber ?? String(i),
    departureFlightDate: f.std ? f.std.toISOString().slice(0, 10) : null,
    destination: f.destination,
    std: f.std,
    etd: f.etd,
    departureIfplid: null,
    departureCancelled: false,
  }));
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
      if (p.type === "SLOT") {
        const slot = matchSlot(p.data, iataOf, slotFlights(flights));
        return slot.matched ? `${slot.flightId} DEPARTURE_PART` : slot.reason;
      }
      const result = matchMessage(p, m.receivedAt, AIRLINES, matchFlights(flights));
      return result.matched ? `${result.flightId} ${result.key.part}` : result.reason;
    });

    it("parses every message without a warning", () => {
      expect(parsed.flatMap((p) => p?.warnings ?? [])).toEqual([]);
    });

    it("matches each to its flight part, and leaves the foreign one unmatched", () => {
      expect(matched).toEqual([
        "ZZ1101 DEPARTURE_PART",
        "ZZ1101 DEPARTURE_PART",
        "ZZ1101 DEPARTURE_PART",
        "ZZ1203 ARRIVAL_PART",
        "ZZ1305 DEPARTURE_PART",
        "ZZ1305 DEPARTURE_PART",
        "ZZ1305 DEPARTURE_PART",
        "airline",
        "ZZ1407 DEPARTURE_PART",
        // 8. mérföldkő: the Lufthansa messages on the ZZ1101 arrival, its arrival MVT,
        "ZZ1101 ARRIVAL_PART",
        "ZZ1101 ARRIVAL_PART",
        "ZZ1101 ARRIVAL_PART",
        "ZZ1101 ARRIVAL_PART",
        // the ZZ1102 arrival at STN, the Turkish PSM and PTM of ZZ1204,
        "ZZ1101 DEPARTURE_PART",
        "ZZ1203 DEPARTURE_PART",
        "ZZ1203 DEPARTURE_PART",
        // and the slots: SAM and SRM of ZZ1306, SAM of ZZ1408.
        "ZZ1305 DEPARTURE_PART",
        "ZZ1305 DEPARTURE_PART",
        "ZZ1407 DEPARTURE_PART",
      ]);
    });

    it("warns about the slot of ZZ1408, whose ETD is too late for it, and not about ZZ1306", () => {
      const slots = parsed.filter((p): p is ParsedMessage & { type: "SLOT" } => p?.type === "SLOT").map((p) => slotOf(p.data)!);
      const planned = (number: string) => {
        const f = flights.find((x) => x.outboundFlightNumber === number)!;
        return f.etd ?? f.std;
      };
      expect(slotLateness(planned("ZZ1306"), slots[1], 10)).toBeNull();
      expect(slotLateness(planned("ZZ1408"), slots[2], 10)).toBe(17);
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

describe("the demo delay codes", () => {
  it("describes every code of the default table, the slot causes among them", () => {
    expect(SEED_DELAY_CODES.map((c) => c.code)).toEqual(["36", "68", "81", "82", "93"]);
    for (const code of SEED_DELAY_CODES) expect(code.description.length).toBeGreaterThan(10);
  });

  it("gives the demo airline a document of its own that says it is a sample", () => {
    expect(SEED_DELAY_DOCUMENT.airline).toBe(SEED_AIRLINE.iataCode);
    const bytes = seedDelayCodePdf();
    expect(checkDelayDocument(bytes)).toEqual({ ok: true });
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain("MINTA");
    expect(text).toContain("nem valodi legitarsasagi dokumentum");
    // Parentheses are escaped, or the PDF would not open.
    expect(text).toContain("\\(ZZ\\)");
  });
});
