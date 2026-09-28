import { describe, expect, it } from "vitest";
import { checkCpm, checkLdm, compareLdmCpm } from "@/lib/telex/checks";
import { loadWeight, type CpmData } from "@/lib/telex/cpm";
import type { LdmData } from "@/lib/telex/ldm";
import { matchMessage } from "@/lib/telex/match";
import type { MvtData } from "@/lib/telex/mvt";
import { parseMessage, type ParsedMessage } from "@/lib/telex/parse";
import { CPM_LH, LDM_LH, MVT_LH_AA } from "@/lib/telex/samples.fixture";
import { splitMessages, type SupportedType } from "@/lib/telex/split";

// The LH1338 FRA–BUD messages of 27 September 2026 (docs/messages.md,
// "Ellenőrzés a Lufthansa-mintán"): the body gives these values, without a
// warning. The SI is free text.

function parse(text: string): ParsedMessage {
  const [message] = splitMessages(text).messages;
  return parseMessage(message as typeof message & { type: SupportedType });
}

const ldm = parse(LDM_LH);
const cpm = parse(CPM_LH);
const ldmData = ldm.data as LdmData;
const cpmData = cpm.data as CpmData;

describe("the Lufthansa LDM", () => {
  it("is read without a warning", () => {
    expect(ldm.warnings).toEqual([]);
    expect(ldm.header).toMatchObject({ flightNumber: "LH1338", date: { day: 27 }, registration: "DAIQT" });
    expect(ldmData.configuration).toBe("C20M138");
    expect(ldmData.crew).toEqual({ cockpit: 2, cabin: 4 });
  });

  it("reads the main deck without a prefix, the holds and the passengers per class", () => {
    expect(ldmData.legs).toEqual([
      {
        destination: "BUD",
        passengers: { male: 96, female: 48, child: 2, infant: 1 },
        mainDeck: 0,
        totalLoad: 3336,
        holds: [
          { hold: "1", weight: 1511 },
          { hold: "3", weight: 1003 },
          { hold: "4", weight: 588 },
          { hold: "5", weight: 234 },
        ],
        paxByClass: [12, 134],
        pad: [],
      },
    ]);
  });

  it("keeps JMP, CRW and PAD per class as given", () => {
    expect(ldmData.jumpSeats).toBe(0);
    expect(ldmData.crw).toEqual([0]);
    expect(ldmData.pad).toEqual([0, 3]);
  });

  it("keeps the SI verbatim, with the DAA and the framed instruction", () => {
    const lines = ldmData.si!.split("\n");
    expect(lines[0]).toBe("SI DAA/52/2/BUD//2 STROLLER.");
    expect(lines).toContain("TAILTIPPING CRITICAL AIRCRAFT  DO NOT START UNLOADING OF THE");
    expect(lines.at(-1)).toBe("DHC/0/0");
    expect(lines).toHaveLength(8);
  });

  it("adds up: 96 + 48 + 2 = 146 = 12 + 134 without the infant, and 0 + 1511 + 1003 + 588 + 234 = 3336", () => {
    expect(checkLdm(ldmData)).toEqual([]);
  });
});

describe("the Lufthansa CPM", () => {
  it("is read without a warning, from a header without a station", () => {
    expect(cpm.warnings).toEqual([]);
    expect(cpmData).toMatchObject({ totalWeight: null, from: null, to: null, headerExtra: [] });
    expect(cpmData.positions.map((p) => p.position)).toEqual(["11", "12", "13", "31", "32", "41", "42", "51", "52"]);
  });

  it("reads free quarters, urgent cargo, the Lufthansa codes and several items on a position", () => {
    const at = (position: string) => cpmData.positions.find((p) => p.position === position)!;
    expect(at("11")).toMatchObject({ uld: "AKH42390LH", destination: "BUD", weight: 565, items: [{ weight: 565, category: "BY" }], freeQuarters: 0 });
    expect(at("32")).toMatchObject({ category: "BY", freeQuarters: 1 });
    expect(at("41")).toMatchObject({ category: "BC", freeQuarters: 1 });
    expect(at("13")).toMatchObject({ category: "C", codes: ["XCS"] });
    expect(at("42")).toMatchObject({ category: "Q", codes: ["XOM"], contour: null });
    expect(at("51")).toMatchObject({ uld: null, items: [{ weight: 30, category: "D" }], freeQuarters: 1, codes: [] });
    expect(at("52")).toMatchObject({
      hold: "5",
      weight: 234,
      items: [
        { weight: 47, category: "BC" },
        { weight: 187, category: "BY" },
      ],
      freeQuarters: 3,
    });
  });

  it("counts the crew bags apart from the load", () => {
    const holds = new Map<string, number>();
    for (const p of cpmData.positions) holds.set(p.hold!, (holds.get(p.hold!) ?? 0) + loadWeight(p));
    // 1: 565 + 550 + 396; 3: 555 + 448; 4: 409 + 179; 5: 47 + 187, the 30 kg of D in 51 left out.
    expect(Object.fromEntries(holds)).toEqual({ "1": 1511, "3": 1003, "4": 588, "5": 234 });
    expect(checkCpm(cpmData)).toEqual([]);
  });

  it("agrees with the LDM hold by hold", () => {
    expect(compareLdmCpm(ldmData, cpmData)).toEqual([]);
  });

  it("keeps the SI verbatim up to the end, the continued B line with its spaces", () => {
    const lines = cpmData.si!.split("\n");
    expect(lines[0]).toBe("SI DAA/52/2/BUD//2 STROLLER.");
    expect(lines).toContain("LOAD IN CPTS 0/0 1/1511 3/1003 4/588 5/234");
    expect(lines.at(-1)).toBe("   /BUD/BY/11/187");
  });

  it("goes to the arrival part by its flight number", () => {
    const flights = [
      {
        id: "lh",
        airlineId: "lh",
        inboundFlightNumber: "LH1338",
        outboundFlightNumber: "LH1339",
        arrivalFlightDate: "2026-09-27",
        departureFlightDate: "2026-09-27",
        origin: "FRA",
        destination: "FRA",
        arrivalRegistration: null,
        departureRegistration: null,
      },
    ];
    const result = matchMessage(cpm, new Date("2026-09-27T10:30:00Z"), [{ id: "lh", code: "LH" }], flights);
    expect(result).toMatchObject({ matched: true, flightId: "lh", key: { part: "ARRIVAL_PART" } });
  });
});

describe("the Lufthansa arrival MVT", () => {
  it("gives touchdown and on-block", () => {
    const mvt = parse(MVT_LH_AA);
    expect(mvt.warnings).toEqual([]);
    expect((mvt.data as MvtData).arrival).toEqual({
      touchdown: { day: 27, hour: 11, minute: 10 },
      onBlock: { day: 27, hour: 11, minute: 14 },
    });
  });
});
