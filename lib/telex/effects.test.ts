import { describe, expect, it } from "vitest";
import { messageEffects, versionKey, versionKind, type EffectFlight } from "@/lib/telex/effects";
import { parseMessage, type ParsedMessage } from "@/lib/telex/parse";
import { SAMPLES } from "@/lib/telex/samples.fixture";
import { splitMessages, type SupportedType } from "@/lib/telex/split";

function parse(text: string): ParsedMessage {
  const [message] = splitMessages(text).messages;
  return parseMessage(message as typeof message & { type: SupportedType });
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

const ET12 = flight({ std: new Date("2026-09-12T06:00:00Z"), departureFlightDate: "2026-09-12" });

describe("what a message does to its flight", () => {
  it("gives the ET 3365/12 the ATD of the 17th, its delay codes, and warns that they do not cover the delay", () => {
    const effects = messageEffects(parse(SAMPLES.MVT_ET), "DEPARTURE_PART", ET12);
    expect(effects.atd?.toISOString()).toBe("2026-09-17T07:16:00.000Z");
    expect(effects.times.airborne?.toISOString()).toBe("2026-09-17T07:35:00.000Z");
    // EA 1745 without a day: after the take-off, the same day.
    expect(effects.times.estimatedArrival?.toISOString()).toBe("2026-09-17T17:45:00.000Z");
    expect(effects.delays).toEqual([
      { code: "68", minutes: 40 },
      { code: "36", minutes: 36 },
    ]);
    expect(effects.warnings).toEqual([{ code: "delaySum", params: { sum: 76, delay: 7276 } }]);
    expect(effects.eta).toBeUndefined();
  });

  it("gives an on-time departure its ATD without warnings", () => {
    const p7 = flight({ std: new Date("2026-09-16T20:35:00Z"), departureFlightDate: "2026-09-16" });
    const effects = messageEffects(parse(SAMPLES.MVT_P7), "DEPARTURE_PART", p7);
    expect(effects.atd?.toISOString()).toBe("2026-09-16T20:36:00.000Z");
    // One minute late without a code: still a difference to show.
    expect(effects.warnings).toEqual([{ code: "delaySum", params: { sum: 0, delay: 1 } }]);
    expect(effects.delays).toEqual([]);
  });

  it("gives the ATA from a BUD arrival MVT", () => {
    const arriving = flight({ sta: new Date("2026-09-16T23:00:00Z"), arrivalFlightDate: "2026-09-16" });
    const effects = messageEffects(parse("MVT\nP75536/16.URNPA.BUD\nAA162310/162318"), "ARRIVAL_PART", arriving);
    expect(effects.ata?.toISOString()).toBe("2026-09-16T23:18:00.000Z");
    expect(effects.atd).toBeUndefined();
  });

  it("gives the ETA from another station's MVT with EA for BUD, past midnight", () => {
    const arriving = flight({ sta: new Date("2026-09-16T23:30:00Z"), arrivalFlightDate: "2026-09-16" });
    const effects = messageEffects(parse("MVT\nP75536/16.URNPA.OSR\nAD162300/162310 EA0050 BUD"), "ARRIVAL_PART", arriving);
    expect(effects.eta?.toISOString()).toBe("2026-09-17T00:50:00.000Z");
    expect(effects.atd).toBeUndefined();
    expect(effects.delays).toBeUndefined();
  });

  it("changes nothing on a cancelled part, with a warning (rule 17)", () => {
    const effects = messageEffects(parse(SAMPLES.MVT_ET), "DEPARTURE_PART", { ...ET12, departureCancelled: true });
    expect(effects.atd).toBeUndefined();
    expect(effects.delays).toBeUndefined();
    expect(effects.warnings).toEqual([{ code: "partCancelled" }]);
  });

  it("leaves the flight's times alone for LDM, CPM and UCM, checking them", () => {
    const effects = messageEffects(parse(SAMPLES.CPM_CZ), "ARRIVAL_PART", flight({ arrivalFlightDate: "2026-09-19" }));
    expect(effects).toEqual({ times: {}, warnings: [] });
  });
});

describe("versions", () => {
  it("keys a message by flight part, type and kind", () => {
    expect(versionKind(parse(SAMPLES.MVT_ET))).toBe("AD");
    expect(versionKind(parse("MVT\nP75536/16.URNPA.BUD\nAA162310/162318"))).toBe("AA");
    expect(versionKind(parse("MVT\nP75536/16.URNPA.OSR\nAD162300/162310 EA0050 BUD"))).toBe("EA");
    expect(versionKind(parse(SAMPLES.UCM_P7_IN))).toBe("IN");
    expect(versionKind(parse(SAMPLES.UCM_P7_OUT))).toBe("OUT");
    expect(versionKind(parse(SAMPLES.LDM_P7))).toBe("LDM");
    expect(versionKey("f1", "DEPARTURE_PART", "MVT", "AD")).toBe("f1|DEPARTURE_PART|MVT|AD");
  });
});
