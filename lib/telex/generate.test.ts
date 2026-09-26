import { describe, expect, it } from "vitest";
import { resolveTimes } from "@/lib/telex/effects";
import { generateDepartureMvt, telexText, type DepartureMvtInput } from "@/lib/telex/generate";
import type { MvtData } from "@/lib/telex/mvt";
import { parseMessage } from "@/lib/telex/parse";
import { SAMPLES } from "@/lib/telex/samples.fixture";
import { splitMessages, type SupportedType } from "@/lib/telex/split";

function readBack(text: string) {
  const { messages } = splitMessages(text);
  expect(messages).toHaveLength(1);
  return parseMessage(messages[0] as (typeof messages)[number] & { type: SupportedType });
}

const ET: DepartureMvtInput = {
  flightNumber: "ET3365",
  operatingDay: "2026-09-12",
  registration: "ETBAB",
  offBlock: new Date("2026-09-17T07:16:00Z"),
  airborne: new Date("2026-09-17T07:35:00Z"),
  estimatedArrival: new Date("2026-09-17T17:45:00Z"),
  destination: "HKG",
  delays: [
    { code: "68", minutes: 40 },
    { code: "36", minutes: 36 },
  ],
  si: "Late order of catering",
};

describe("generating the departure MVT", () => {
  it("writes the structure of the samples", () => {
    expect(generateDepartureMvt(ET)).toEqual({
      text: "MVT\nET3365/12.ETBAB.BUD\nAD170716/170735 EA171745 HKG\nDL68/36/0040/0036\nSI LATE ORDER OF CATERING",
      warnings: [],
    });
    const p7 = generateDepartureMvt({
      ...ET,
      flightNumber: "P75535",
      operatingDay: "2026-09-16",
      registration: "URNPA",
      offBlock: new Date("2026-09-16T20:36:00Z"),
      airborne: new Date("2026-09-16T20:49:00Z"),
      estimatedArrival: new Date("2026-09-16T21:32:00Z"),
      destination: "OSR",
      delays: [],
      si: null,
    });
    // The sample MVT of P7 5535/16, character for character.
    expect(p7.text).toBe(SAMPLES.MVT_P7);
  });

  it("is read back by our own parser with the same values", () => {
    const { text } = generateDepartureMvt(ET);
    const parsed = readBack(text);
    expect(parsed.warnings).toEqual([]);
    expect(parsed.header).toMatchObject({ flightNumber: "ET3365", date: { day: 12 }, registration: "ETBAB", fields: ["BUD"] });
    const data = parsed.data as MvtData;
    expect(data.delays).toEqual(ET.delays);
    expect(data.estimatedArrival?.destination).toBe("HKG");
    expect(data.si).toEqual(["LATE ORDER OF CATERING"]);
    // The times resolve to the same instants against the flight.
    const times = resolveTimes(parsed, "DEPARTURE_PART", {
      sta: null,
      std: new Date("2026-09-12T06:00:00Z"),
      arrivalFlightDate: null,
      departureFlightDate: "2026-09-12",
      arrivalCancelled: false,
      departureCancelled: false,
    });
    expect(times.offBlock).toEqual(ET.offBlock);
    expect(times.airborne).toEqual(ET.airborne);
    expect(times.estimatedArrival).toEqual(ET.estimatedArrival);
  });

  it("leaves out what is not known: airborne, the estimate, delays, SI", () => {
    const { text } = generateDepartureMvt({ ...ET, airborne: null, estimatedArrival: null, delays: [], si: " " });
    expect(text).toBe("MVT\nET3365/12.ETBAB.BUD\nAD170716");
    expect(readBack(text).warnings).toEqual([]);
  });

  it("carries at most two delay codes, and warns about the rest", () => {
    const { text, warnings } = generateDepartureMvt({ ...ET, delays: [...ET.delays, { code: "93", minutes: 7200 }] });
    expect(text).toContain("DL68/36/0040/0036");
    expect(warnings).toEqual([{ code: "tooManyDelayCodes", params: { count: 3, max: 2 } }]);
  });

  it("warns when a delay does not fit in hhmm", () => {
    const { text, warnings } = generateDepartureMvt({ ...ET, delays: [{ code: "93", minutes: 7276 }] });
    expect(text).toContain("DL93/9959");
    expect(warnings).toEqual([{ code: "delayTooLong", params: { code: "93", minutes: 7276 } }]);
  });

  it("writes SI in the characters of a telex", () => {
    expect(telexText("Késő catering; ügynök: Kiss Péter!")).toBe("KESO CATERING UGYNOK: KISS PETER");
  });
});
