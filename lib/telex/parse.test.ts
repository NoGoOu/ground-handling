import { describe, expect, it } from "vitest";
import type { CpmData } from "@/lib/telex/cpm";
import type { LdmData } from "@/lib/telex/ldm";
import type { MvtData } from "@/lib/telex/mvt";
import { parseMessage, type ParsedMessage } from "@/lib/telex/parse";
import { SAMPLES } from "@/lib/telex/samples.fixture";
import { splitMessages, type SupportedType } from "@/lib/telex/split";
import type { UcmData } from "@/lib/telex/ucm";

function parse(text: string): ParsedMessage {
  const [message] = splitMessages(text).messages;
  return parseMessage(message as typeof message & { type: SupportedType });
}
const mvt = (text: string) => parse(text) as ParsedMessage & { data: MvtData };
const ldm = (text: string) => parse(text) as ParsedMessage & { data: LdmData };
const cpm = (text: string) => parse(text) as ParsedMessage & { data: CpmData };
const ucm = (text: string) => parse(text) as ParsedMessage & { data: UcmData };

describe("MVT", () => {
  it("reads off-block, airborne and the estimated arrival (P7 5535/16)", () => {
    const { data, warnings, header } = mvt(SAMPLES.MVT_P7);
    expect(header?.flightNumber).toBe("P75535");
    expect(warnings).toEqual([]);
    expect(data).toEqual({
      station: "BUD",
      departure: { offBlock: { day: 16, hour: 20, minute: 36 }, airborne: { day: 16, hour: 20, minute: 49 } },
      arrival: null,
      estimatedArrival: { time: { day: 16, hour: 21, minute: 32 }, destination: "OSR" },
      delays: [],
      si: [],
    });
  });

  it("reads the delay codes with their minutes and the SI (ET 3365/12)", () => {
    const { data, warnings } = mvt(SAMPLES.MVT_ET);
    expect(warnings).toEqual([]);
    expect(data.departure?.offBlock).toEqual({ day: 17, hour: 7, minute: 16 });
    expect(data.estimatedArrival).toEqual({ time: { day: null, hour: 17, minute: 45 }, destination: "HKG" });
    expect(data.delays).toEqual([
      { code: "68", minutes: 40 },
      { code: "36", minutes: 36 },
    ]);
    expect(data.si).toEqual(["LATE ORDER OF CATERING"]);
  });

  it("reads an arrival like a departure: touchdown and on-block (approved decision)", () => {
    const { data, warnings } = mvt("MVT\nP75536/16.URNPA.BUD\nAA162310/162318");
    expect(warnings).toEqual([]);
    expect(data.arrival).toEqual({ touchdown: { day: 16, hour: 23, minute: 10 }, onBlock: { day: 16, hour: 23, minute: 18 } });
  });

  it("warns about an unknown line and a broken delay line, and still reads the rest", () => {
    const { data, warnings } = mvt("MVT\nET3365/12.ETBAB.BUD\nXX SOMETHING\nAD170716/170735 EA1745 HKG\nDL68/36/0040");
    expect(data.departure?.offBlock).toEqual({ day: 17, hour: 7, minute: 16 });
    expect(warnings.map((w) => w.code)).toEqual(["unknownLine", "delayCount"]);
    expect(data.delays).toEqual([
      { code: "68", minutes: 40 },
      { code: "36", minutes: null },
    ]);
  });
});

describe("LDM", () => {
  it("reads a freighter's load per hold and main deck, and the breakdown (P7 5535/16)", () => {
    const { data, warnings } = ldm(SAMPLES.LDM_P7);
    expect(warnings).toEqual([]);
    expect(data.configuration).toBe("0Y");
    expect(data.crew).toEqual({ cockpit: 2, cabin: 1 });
    expect(data.legs).toEqual([
      {
        destination: "OSR",
        passengers: { male: 0, female: 0, child: 0, infant: 0 },
        totalLoad: 1983,
        mainDeck: 1305,
        holds: [
          { hold: "1", weight: 50 },
          { hold: "2", weight: 0 },
          { hold: "3", weight: 351 },
          { hold: "4", weight: 277 },
        ],
        paxByClass: [0],
        pad: [0],
      },
    ]);
    expect(data.specialItems).toEqual([
      { code: "ELD", position: "A9", weight: 335 },
      { code: "ELD", position: "A10", weight: 970 },
      { code: "FKT", position: "1", weight: 50 },
      { code: "FKT", position: "3", weight: 351 },
      { code: "FKT", position: "4", weight: 277 },
    ]);
    expect(data.si).toEqual([
      {
        station: "OSR",
        entries: [
          { key: "C", value: 0 },
          { key: "E", value: 1983 },
          { key: "M", value: 0 },
        ],
        text: "OSR C/0.E/1983.M/0",
      },
    ]);
  });

  it("reads the passengers and the baggage of a passenger flight (EW 2783/03)", () => {
    const { data, warnings } = ldm(SAMPLES.LDM_EW);
    expect(warnings).toEqual([]);
    expect(data.configuration).toBe("Y150");
    expect(data.crew).toEqual({ cockpit: 2, cabin: 3 });
    expect(data.legs[0]).toMatchObject({
      destination: "STR",
      passengers: { male: 82, female: 52, child: 0, infant: 0 },
      totalLoad: 825,
      holds: [{ hold: "4", weight: 825 }],
      paxByClass: [134],
    });
    expect(data.si[0].entries).toEqual([
      { key: "BP", value: 57 },
      { key: "B", value: 825 },
      { key: "TB", value: 2 },
    ]);
  });
});

describe("CPM", () => {
  it("reads the positions of a freighter with the destination before the weight (P7 5535/16)", () => {
    const { data, warnings } = cpm(SAMPLES.CPM_P7);
    expect(warnings).toEqual([]);
    expect(data).toMatchObject({ totalWeight: 1983, from: "BUD", to: null });
    expect(data.positions).toHaveLength(16);
    expect(data.positions.filter((p) => p.empty).map((p) => p.position)).toEqual([
      "A1",
      "A2",
      "A3",
      "A4",
      "A5",
      "A6",
      "A7",
      "A8",
      "A11",
      "P12",
      "2",
    ]);
    expect(data.positions.find((p) => p.position === "A9")).toEqual({
      position: "A9",
      deck: "MAIN",
      hold: null,
      side: null,
      empty: false,
      uld: "PAG72809AGH",
      weight: 335,
      destination: "OSR",
      contour: null,
      category: "E",
      codes: ["ELD"],
    });
    expect(data.positions.find((p) => p.position === "1")).toMatchObject({
      deck: "LOWER",
      hold: "1",
      uld: null,
      weight: 50,
      destination: "OSR",
      category: "E",
      codes: ["FKT"],
    });
  });

  it("reads a widebody freighter with sections, contours, the weight before the destination and SI weights (CZ 2557/19SEP26)", () => {
    const { data, warnings, header } = cpm(SAMPLES.CPM_CZ);
    expect(warnings).toEqual([]);
    expect(header?.date).toEqual({ date: "2026-09-19" });
    // ".TW/92404" is read as the total weight.
    expect(data).toMatchObject({ totalWeight: 92404, from: "CAN", to: "BUD", headerExtra: ["4/1"] });
    expect(data.destinationTotals).toEqual([{ station: "BUD", weight: 92404 }]);
    expect(data.positions.find((p) => p.position === "GR")).toEqual({
      position: "GR",
      deck: "MAIN",
      hold: null,
      side: "RIGHT SIDE",
      empty: false,
      uld: "PMC45245CZ",
      weight: 4765,
      destination: "BUD",
      contour: "Q5",
      category: "C",
      codes: ["ELI"],
    });
    expect(data.positions.find((p) => p.position === "R")).toMatchObject({ deck: "MAIN", side: "CENTER" });
    expect(data.positions.find((p) => p.position === "11P")).toMatchObject({ deck: "LOWER", hold: "1", empty: true });
    expect(data.positions.find((p) => p.position === "33LR")).toMatchObject({ hold: "3", uld: "FLA21075CZ", codes: ["BIG"] });
    expect(data.positions.find((p) => p.position === "BLK")).toMatchObject({ deck: "LOWER", hold: null, weight: 108, category: "C" });
    expect(data.weights).toEqual([
      { name: "ZFW", value: 234408 },
      { name: "ZF INDEX", value: 41.46 },
      { name: "ZF C.G.", value: 26.71 },
      { name: "TOW", value: 346078 },
      { name: "TO INDEX", value: 35.67 },
      { name: "TO C.G.", value: 26.27 },
      { name: "STAB TRIM", value: 5.89 },
      { name: "TAKE OFF FUEL", value: 111670 },
      { name: "TRIP FUEL", value: 98206 },
    ]);
  });

  it("does not depend on the order of the fields in a position line", () => {
    const orders = [
      "-A9/PAG72809AGH/OSR/335/E.ELD",
      "-A9/PAG72809AGH/335/OSR/E.ELD",
      "-A9/335/OSR/PAG72809AGH/E.ELD",
      "-A9/E.ELD/OSR/PAG72809AGH/335",
    ];
    const read = orders.map((line) => cpm(`CPM\nP75535/16.URNPA.1983.BUD\n${line}`));
    expect(read.every((r) => r.warnings.length === 0)).toBe(true);
    expect(new Set(read.map((r) => JSON.stringify(r.data.positions)))).toHaveProperty("size", 1);
    const bulk = ["-1/OSR/50/E.FKT", "-1/50/OSR/E.FKT"].map((line) => cpm(`CPM\nP75535/16.URNPA.1983.BUD\n${line}`));
    expect(bulk[0].data.positions).toEqual(bulk[1].data.positions);
  });

  it("warns about lines after CPM END", () => {
    const { warnings } = cpm(`${SAMPLES.CPM_CZ}\nREGARDS`);
    expect(warnings).toEqual([{ code: "afterEnd", params: { line: "REGARDS" } }]);
  });
});

describe("UCM", () => {
  it("reads the outgoing ULDs with their destination and category (P7 5535/16 OUT)", () => {
    const { data, warnings } = ucm(SAMPLES.UCM_P7_OUT);
    expect(warnings).toEqual([]);
    expect(data.station).toBe("BUD");
    expect(data.direction).toBe("OUT");
    expect(data.items).toHaveLength(12);
    expect(data.items.filter((i) => i.category === "E").map((i) => i.uld)).toEqual(["PAJ17653FF", "PAG59334JG"]);
    expect(data.items.every((i) => i.station === "OSR")).toBe(true);
  });

  it("reads the incoming ULDs (P7 1103/12 IN)", () => {
    const { data, warnings } = ucm(SAMPLES.UCM_P7_IN);
    expect(warnings).toEqual([]);
    expect(data.direction).toBe("IN");
    expect(data.items).toHaveLength(11);
    expect(data.items).toContainEqual({ uld: "PAG72809AGH", station: "RMO", category: "X" });
  });
});
