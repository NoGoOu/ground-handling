import { describe, expect, it } from "vitest";
import { messages } from "@/lib/messages";
import { resolveDayTime, resolveOperatingDay } from "@/lib/telex/day-time";
import { matchMessage, splitFlightNumber, type MatchFlight, type UnmatchedReason } from "@/lib/telex/match";
import type { MvtData } from "@/lib/telex/mvt";
import { parseMessage, type ParsedMessage } from "@/lib/telex/parse";
import { SAMPLES } from "@/lib/telex/samples.fixture";
import { splitMessages, type SupportedType } from "@/lib/telex/split";

function parse(text: string): ParsedMessage {
  const [message] = splitMessages(text).messages;
  return parseMessage(message as typeof message & { type: SupportedType });
}

const AIRLINES = [
  { id: "p7", code: "P7" },
  { id: "et", code: "ET" },
  { id: "cz", code: "CZ" },
  { id: "ew", code: "EW" },
];

function flight(id: string, airlineId: string, overrides: Partial<MatchFlight>): MatchFlight {
  return {
    id,
    airlineId,
    inboundFlightNumber: null,
    outboundFlightNumber: null,
    arrivalFlightDate: null,
    departureFlightDate: null,
    origin: null,
    destination: null,
    arrivalRegistration: null,
    departureRegistration: null,
    ...overrides,
  };
}

// ET 3365 flies daily: the one of the 12th and the one of the 17th.
const ET12 = flight("et12", "et", { outboundFlightNumber: "ET3365", departureFlightDate: "2026-09-12", destination: "HKG" });
const ET17 = flight("et17", "et", { outboundFlightNumber: "ET3365", departureFlightDate: "2026-09-17", destination: "HKG" });
const P7_5535 = flight("p7-16", "p7", { outboundFlightNumber: "P75535", departureFlightDate: "2026-09-16", destination: "OSR" });
const P7_1103 = flight("p7-12", "p7", { inboundFlightNumber: "P71103", arrivalFlightDate: "2026-09-12", origin: "RMO" });
const CZ = flight("cz", "cz", { inboundFlightNumber: "CZ2557", arrivalFlightDate: "2026-09-19", origin: "CAN" });
const FLIGHTS = [ET12, ET17, P7_5535, P7_1103, CZ];

const at = (iso: string) => new Date(iso);

describe("matching a message to a flight part", () => {
  it("matches the ET3365/12 MVT, received on the 17th, to the flight of the 12th, with the ATD on the 17th at 07:16 UTC", () => {
    const message = parse(SAMPLES.MVT_ET);
    const result = matchMessage(message, at("2026-09-17T07:30:00Z"), AIRLINES, FLIGHTS);
    expect(result).toMatchObject({
      matched: true,
      flightId: "et12",
      key: { flightNumber: "ET3365", operatingDay: "2026-09-12", part: "DEPARTURE_PART" },
    });
    const offBlock = (message.data as MvtData).departure!.offBlock;
    expect(resolveDayTime(offBlock, at("2026-09-12T00:00:00Z")).toISOString()).toBe("2026-09-17T07:16:00.000Z");
  });

  it("matches the P7 5535/16 messages to its departure part and the P7 1103/12 UCM IN to the arrival", () => {
    const received = at("2026-09-16T21:00:00Z");
    for (const sample of [SAMPLES.MVT_P7, SAMPLES.LDM_P7, SAMPLES.CPM_P7, SAMPLES.UCM_P7_OUT]) {
      expect(matchMessage(parse(sample), received, AIRLINES, FLIGHTS)).toMatchObject({
        matched: true,
        flightId: "p7-16",
        key: { part: "DEPARTURE_PART" },
      });
    }
    expect(matchMessage(parse(SAMPLES.UCM_P7_IN), at("2026-09-12T10:00:00Z"), AIRLINES, FLIGHTS)).toMatchObject({
      matched: true,
      flightId: "p7-12",
      key: { part: "ARRIVAL_PART" },
    });
  });

  it("matches a CPM by its route: CAN to BUD is the arrival part", () => {
    expect(matchMessage(parse(SAMPLES.CPM_CZ), at("2026-09-19T20:00:00Z"), AIRLINES, FLIGHTS)).toMatchObject({
      matched: true,
      flightId: "cz",
      key: { operatingDay: "2026-09-19", part: "ARRIVAL_PART" },
    });
  });

  it("takes the ETA from another station's MVT whose EA is for BUD", () => {
    const inbound = flight("in", "p7", { inboundFlightNumber: "P75536", arrivalFlightDate: "2026-09-16", origin: "OSR" });
    const message = parse("MVT\nP75536/16.URNPA.OSR\nAD162300/162310 EA170050 BUD");
    expect(matchMessage(message, at("2026-09-16T23:15:00Z"), AIRLINES, [inbound])).toMatchObject({
      matched: true,
      flightId: "in",
      key: { part: "ARRIVAL_PART" },
    });
  });

  it("fills a missing registration and warns about a different one", () => {
    const received = at("2026-09-16T21:00:00Z");
    expect(matchMessage(parse(SAMPLES.MVT_P7), received, AIRLINES, [P7_5535])).toMatchObject({ fillRegistration: "URNPA" });
    const other = { ...P7_5535, departureRegistration: "URNPB" };
    const result = matchMessage(parse(SAMPLES.MVT_P7), received, AIRLINES, [other]);
    expect(result).toMatchObject({ matched: true, fillRegistration: null });
    expect(result.warnings).toEqual([{ code: "registrationMismatch", params: { flight: "URNPB", message: "URNPA" } }]);
  });

  it("leaves unmatched what it cannot match, saying why", () => {
    const reason = (text: string, flights = FLIGHTS, airlines = AIRLINES) => {
      const result = matchMessage(parse(text), at("2026-09-16T21:00:00Z"), airlines, flights);
      return result.matched ? null : result.reason;
    };
    const reasons: Record<string, UnmatchedReason | null> = {
      // EW 2783 goes to STR and departs from elsewhere.
      notHome: reason(SAMPLES.LDM_EW),
      airline: reason(SAMPLES.MVT_P7, FLIGHTS, AIRLINES.filter((a) => a.code !== "P7")),
      none: reason(SAMPLES.MVT_P7, [ET12]),
      many: reason(SAMPLES.MVT_P7, [P7_5535, { ...P7_5535, id: "twin" }]),
      noHeader: reason("MVT\nAD162036/162049"),
      part: reason("UCM\nP75535/16.URNPA.BUD\n.PAG59334JG/OSR/E"),
    };
    expect(reasons).toEqual({
      notHome: "notHome",
      airline: "airline",
      none: "none",
      many: "many",
      noHeader: "noHeader",
      part: "part",
    });
    // Each reason has a text for the "Párosítatlan üzenetek" list.
    expect(Object.keys(reasons).every((r) => r in messages.telex.unmatched)).toBe(true);
  });
});

describe("flight numbers and days", () => {
  it("splits the airline code off by the airlines we know", () => {
    expect(splitFlightNumber("P75535", AIRLINES)).toMatchObject({ flightNumber: "P75535", airline: { code: "P7" } });
    expect(splitFlightNumber("ET0765", AIRLINES)).toMatchObject({ flightNumber: "ET765" });
    expect(splitFlightNumber("LH1234", AIRLINES)).toBeNull();
  });

  it("takes the date with the header's day nearest to the receipt", () => {
    expect(resolveOperatingDay(12, at("2026-09-17T07:30:00Z"))).toBe("2026-09-12");
    expect(resolveOperatingDay(30, at("2026-10-02T01:00:00Z"))).toBe("2026-09-30");
    expect(resolveOperatingDay(1, at("2026-09-30T23:00:00Z"))).toBe("2026-10-01");
    // No 31st in September: the 31st of August or October.
    expect(resolveOperatingDay(31, at("2026-09-02T00:00:00Z"))).toBe("2026-08-31");
  });

  it("puts a time without a day at or after its reference", () => {
    const eta = { day: null, hour: 17, minute: 45 };
    expect(resolveDayTime(eta, at("2026-09-17T07:35:00Z")).toISOString()).toBe("2026-09-17T17:45:00.000Z");
    expect(resolveDayTime(eta, at("2026-09-17T18:00:00Z")).toISOString()).toBe("2026-09-18T17:45:00.000Z");
  });
});
