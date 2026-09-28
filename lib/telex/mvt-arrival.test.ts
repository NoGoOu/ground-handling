import { describe, expect, it } from "vitest";
import { messageEffects, resolveTimes, versionKind, type EffectFlight } from "@/lib/telex/effects";
import { correctionOf, generateArrivalMvt, generateDepartureMvt, type ArrivalMvtInput } from "@/lib/telex/generate";
import { matchMessage } from "@/lib/telex/match";
import type { MvtData } from "@/lib/telex/mvt";
import { parseMessage, type ParsedMessage } from "@/lib/telex/parse";
import { MVT_LH_AA, MVT_TK_COR } from "@/lib/telex/samples.fixture";
import { splitMessages, type SupportedType } from "@/lib/telex/split";

// The arrival and the correction MVT (CLAUDE.md, 8. mérföldkő, "Érkezési és
// korrekciós MVT"); our own parser reads the same values back.

function read(text: string): { parsed: ParsedMessage; correction: boolean } {
  const { messages } = splitMessages(text);
  expect(messages).toHaveLength(1);
  const [message] = messages;
  return { parsed: parseMessage(message as typeof message & { type: SupportedType }), correction: message.correction };
}

const flight = (overrides: Partial<EffectFlight>): EffectFlight => ({
  sta: null,
  std: null,
  arrivalFlightDate: null,
  departureFlightDate: null,
  arrivalCancelled: false,
  departureCancelled: false,
  ...overrides,
});

const LH: ArrivalMvtInput = {
  flightNumber: "LH1338",
  operatingDay: "2026-09-27",
  registration: "DAIQT",
  touchdown: new Date("2026-09-27T11:10:00Z"),
  onBlock: new Date("2026-09-27T11:14:00Z"),
  si: null,
};

describe("the arrival MVT", () => {
  it("writes the Lufthansa sample character for character", () => {
    expect(generateArrivalMvt(LH)).toEqual({ text: MVT_LH_AA, warnings: [] });
  });

  it("is read back with the same touchdown and on-block, which gives the ATA", () => {
    const { parsed } = read(generateArrivalMvt({ ...LH, si: "Late stand" }).text);
    expect(parsed.warnings).toEqual([]);
    expect(versionKind(parsed)).toBe("AA");
    const lh = flight({ sta: new Date("2026-09-27T11:05:00Z"), arrivalFlightDate: "2026-09-27" });
    const times = resolveTimes(parsed, "ARRIVAL_PART", lh);
    expect(times.touchdown).toEqual(LH.touchdown);
    expect(times.onBlock).toEqual(LH.onBlock);
    expect(messageEffects(parsed, "ARRIVAL_PART", lh).ata).toEqual(LH.onBlock);
    expect((parsed.data as MvtData).si).toEqual(["LATE STAND"]);
  });

  it("carries the on-block alone when the touchdown is not given", () => {
    const { text } = generateArrivalMvt({ ...LH, touchdown: null });
    expect(text).toBe("MVT\nLH1338/27.DAIQT.BUD\nAA271114");
    expect((read(text).parsed.data as MvtData).arrival).toEqual({ touchdown: null, onBlock: { day: 27, hour: 11, minute: 14 } });
  });
});

describe("the correction MVT", () => {
  it("is the corrected MVT in full with a COR line, read back as a correction with the same values", () => {
    const departure = generateDepartureMvt({
      flightNumber: "ZZ1102",
      operatingDay: "2026-09-28",
      registration: "HAZZA",
      offBlock: new Date("2026-09-28T06:03:00Z"),
      airborne: new Date("2026-09-28T06:11:00Z"),
      estimatedArrival: null,
      destination: null,
      delays: [{ code: "93", minutes: 8 }],
      si: null,
    }).text;
    const corrected = correctionOf(departure);
    expect(corrected.split("\n").slice(0, 2)).toEqual(["COR", "MVT"]);
    const original = read(departure);
    const correction = read(corrected);
    expect(correction.correction).toBe(true);
    expect(original.correction).toBe(false);
    expect(correction.parsed.data).toEqual(original.parsed.data);
    expect(correction.parsed.warnings).toEqual([]);
    expect(versionKind(correction.parsed)).toBe(versionKind(original.parsed));
  });
});

describe("an AA from another station (8. mérföldkő)", () => {
  // TK1034 BUD–IST of the 26th; the COR MVT is its arrival at IST.
  const TK = {
    id: "tk",
    airlineId: "tk",
    inboundFlightNumber: null,
    outboundFlightNumber: "TK1034",
    arrivalFlightDate: null,
    departureFlightDate: "2026-09-26",
    origin: null,
    destination: "IST",
    arrivalRegistration: null,
    departureRegistration: "TCJSO",
  };

  it("belongs to the BUD departure it arrived from, as a correction, for information", () => {
    const { parsed, correction } = read(MVT_TK_COR);
    expect(correction).toBe(true);
    const match = matchMessage(parsed, new Date("2026-09-26T14:40:00Z"), [{ id: "tk", code: "TK" }], [TK]);
    expect(match).toMatchObject({ matched: true, flightId: "tk", key: { part: "DEPARTURE_PART" }, warnings: [] });
    expect(versionKind(parsed)).toBe("AA_DEST");
    const tk = flight({ std: new Date("2026-09-26T11:45:00Z"), departureFlightDate: "2026-09-26" });
    const effects = messageEffects(parsed, "DEPARTURE_PART", tk);
    // It changes none of our times.
    expect(effects.atd).toBeUndefined();
    expect(effects.ata).toBeUndefined();
    expect(effects.eta).toBeUndefined();
    expect(effects.times).toEqual({ touchdown: new Date("2026-09-26T14:21:00Z"), onBlock: new Date("2026-09-26T14:29:00Z") });
  });

  it("stays unmatched when no BUD departure has its flight number", () => {
    const { parsed } = read(MVT_TK_COR);
    const match = matchMessage(parsed, new Date("2026-09-26T14:40:00Z"), [{ id: "tk", code: "TK" }], []);
    expect(match).toMatchObject({ matched: false, reason: "notHome" });
  });
});
