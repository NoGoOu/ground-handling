import { describe, expect, it } from "vitest";
import { buildInfographic, type CurrentMessage } from "@/lib/telex/infographic";
import { parseMessage } from "@/lib/telex/parse";
import { SAMPLES } from "@/lib/telex/samples.fixture";
import { splitMessages, type SupportedType } from "@/lib/telex/split";

function current(text: string, id: string, receivedAt: string): CurrentMessage {
  const [message] = splitMessages(text).messages;
  const parsed = parseMessage(message as typeof message & { type: SupportedType });
  return { ...parsed, id, receivedAt: new Date(receivedAt) } as CurrentMessage;
}

describe("the infographic of a flight part", () => {
  // P7 5535/16 from BUD: all four messages.
  const p7 = buildInfographic([
    current(SAMPLES.MVT_P7, "mvt", "2026-09-16T20:40:00Z"),
    current(SAMPLES.LDM_P7, "ldm", "2026-09-16T20:30:00Z"),
    current(SAMPLES.CPM_P7, "cpm", "2026-09-16T20:31:00Z"),
    current(SAMPLES.UCM_P7_OUT, "ucm", "2026-09-16T20:32:00Z"),
  ]);

  it("takes the passengers and the load from the LDM, with its source", () => {
    expect(p7.passengers).toMatchObject({ male: 0, female: 0, child: 0, infant: 0, total: 0, source: { messageId: "ldm", type: "LDM" } });
    expect(p7.load).toMatchObject({
      total: 1983,
      mainDeck: 1305,
      holds: [
        { hold: "1", weight: 50 },
        { hold: "2", weight: 0 },
        { hold: "3", weight: 351 },
        { hold: "4", weight: 277 },
      ],
      byCategory: [
        { key: "C", value: 0 },
        { key: "E", value: 1983 },
        { key: "M", value: 0 },
      ],
      source: { messageId: "ldm" },
    });
  });

  it("lists the loaded positions, the stacks and the special codes from the CPM", () => {
    expect(p7.ulds?.positions.map((p) => p.position)).toEqual(["A9", "A10", "1", "3", "4"]);
    expect(p7.stacks).toEqual({
      positions: [
        { position: "A9", uld: "PAG72809AGH", weight: 335 },
        { position: "A10", uld: "PAJ17653FF", weight: 970 },
      ],
      ucm: { bases: 2, empties: 10 },
      sources: [
        { messageId: "cpm", type: "CPM", receivedAt: new Date("2026-09-16T20:31:00Z") },
        { messageId: "ucm", type: "UCM", receivedAt: new Date("2026-09-16T20:32:00Z") },
      ],
    });
    expect(p7.specialCodes?.codes).toEqual([
      { code: "ELD", positions: ["A9", "A10"] },
      { code: "FKT", positions: ["1", "3", "4"] },
    ]);
    expect(p7.weights).toBeNull();
  });

  it("shows the checks across the messages: the known UCM–CPM error", () => {
    expect(p7.warnings.map((w) => w.code)).toEqual(["ucmBaseNotInCpm", "cpmStackNotInUcm", "ucmEmptyInCpm"]);
  });

  it("builds the load from the CPM when there is no LDM, with bulk, categories, codes and weights (CZ 2557)", () => {
    const cz = buildInfographic([current(SAMPLES.CPM_CZ, "cz", "2026-09-19T20:00:00Z")]);
    expect(cz.passengers).toBeNull();
    expect(cz.load).toMatchObject({
      total: 92404,
      mainDeck: 74330,
      holds: [
        { hold: "1", weight: 945 },
        { hold: "2", weight: 6788 },
        { hold: "3", weight: 4620 },
        { hold: "4", weight: 5613 },
      ],
      bulk: 108,
      byCategory: [{ key: "C", value: 92404 }],
    });
    expect(cz.specialCodes?.codes).toEqual([
      { code: "ELI", positions: ["GR", "FL", "HL"] },
      { code: "PER", positions: ["DL"] },
      { code: "ELM", positions: ["13P", "21P"] },
      { code: "BIG", positions: ["33LR", "41LR"] },
    ]);
    expect(cz.weights?.values.find((w) => w.name === "TOW")).toEqual({ name: "TOW", value: 346078 });
    expect(cz.stacks).toBeNull();
    expect(cz.warnings).toEqual([]);
  });

  it("gives the baggage in pieces and kg of a passenger flight (EW 2783)", () => {
    const ew = buildInfographic([current(SAMPLES.LDM_EW, "ew", "2026-09-03T10:00:00Z")]);
    expect(ew.passengers).toMatchObject({ male: 82, female: 52, total: 134 });
    expect(ew.load?.byCategory).toEqual([
      { key: "BP", value: 57 },
      { key: "B", value: 825 },
    ]);
  });

  it("is empty without messages", () => {
    expect(buildInfographic([])).toEqual({
      passengers: null,
      load: null,
      ulds: null,
      stacks: null,
      specialCodes: null,
      weights: null,
      warnings: [],
    });
  });
});
