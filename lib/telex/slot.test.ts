import { describe, expect, it } from "vitest";
import type { SlotData } from "@/lib/telex/adexp";
import { versionKind } from "@/lib/telex/effects";
import { parseMessage, type ParsedMessage } from "@/lib/telex/parse";
import { SAM, SRM } from "@/lib/telex/samples.fixture";
import { matchSlot, slotDelay, slotLateness, slotOf, type SlotFlight } from "@/lib/telex/slot";
import { splitMessages } from "@/lib/telex/split";

function parse(text: string): ParsedMessage & { type: "SLOT"; data: SlotData } {
  const [message] = splitMessages(text).messages;
  return parseMessage(message) as ParsedMessage & { type: "SLOT"; data: SlotData };
}

const at = (iso: string) => new Date(iso);

describe("slot messages (ADEXP)", () => {
  it("reads the SAM", () => {
    const { type, data, warnings } = parse(SAM);
    expect(type).toBe("SLOT");
    expect(warnings).toEqual([]);
    expect(data).toEqual({
      title: "SAM",
      arcid: "RYR48VM",
      ifplid: "AA87995557",
      adep: "LHBP",
      ades: "LFOB",
      eobd: "2026-09-27",
      eobt: "1220",
      ctot: "1236",
      taxiMinutes: 12,
      regulations: ["YB5LL27A"],
      cause: { reason: "CE", delayCode: "81" },
      other: ["-TTO -PTID IDOSA -TO 1359 -FL F342"],
    });
  });

  it("reads the SRM with its new slot and three regulations", () => {
    const { data, warnings } = parse(SRM);
    expect(warnings).toEqual([]);
    expect(data).toMatchObject({ title: "SRM", ctot: "1300", ades: "LGSA", regulations: ["LGMW227", "LWUPP27M", "LGSAA27"] });
    expect(data.cause).toEqual({ reason: "SE", delayCode: "82" });
  });

  it("gives the target off-block: CTOT − taxi time", () => {
    expect(slotOf(parse(SAM).data)?.targetOffBlock).toEqual(at("2026-09-27T12:24:00Z"));
    expect(slotOf(parse(SRM).data)?.targetOffBlock).toEqual(at("2026-09-27T12:48:00Z"));
  });

  it("puts a slot past midnight on the next day", () => {
    const late = parse(SAM.replace("-EOBT 1220", "-EOBT 2350").replace("-CTOT 1236", "-CTOT 0020"));
    expect(slotOf(late.data)?.ctot).toEqual(at("2026-09-28T00:20:00Z"));
  });

  it("warns when the planned off-block is later than the target + the tolerance", () => {
    const slot = slotOf(parse(SAM).data)!;
    expect(slotLateness(at("2026-09-27T12:40:00Z"), slot, 10)).toBe(16);
    expect(slotLateness(at("2026-09-27T12:34:00Z"), slot, 10)).toBeNull();
    expect(slotLateness(null, slot, 10)).toBeNull();
  });

  it("offers the delay it gives against the STD, with its code", () => {
    const slot = slotOf(parse(SAM).data)!;
    expect(slotDelay(slot, at("2026-09-27T12:20:00Z"))).toEqual({ code: "81", minutes: 4 });
    expect(slotDelay(slot, at("2026-09-27T12:30:00Z"))).toBeNull();
  });

  it("recognises another title without processing it", () => {
    const other = parse("-TITLE SLC\n-ARCID RYR48VM\n-IFPLID AA87995557\n-ADEP LHBP\n-ADES LFOB");
    expect(other.data.title).toBe("SLC");
    expect(other.warnings).toEqual([{ code: "slotNotProcessed", params: { title: "SLC" } }]);
    expect(slotOf(other.data)).toBeNull();
    // It does not replace the flight plan's SAM or SRM as the slot.
    expect(versionKind(other)).not.toBe(versionKind(parse(SAM)));
    expect(versionKind(parse(SAM))).toBe("AA87995557");
  });

  it("warns about a missing slot", () => {
    expect(parse(SAM.replace("-CTOT 1236\n", "")).warnings).toEqual([{ code: "slotMissingField", params: { field: "CTOT" } }]);
  });
});

describe("matching a slot message to a BUD departure", () => {
  const icao: Record<string, string> = { LFOB: "BVA", LGSA: "CHQ", LHBP: "BUD" };
  const iataOf = (code: string) => icao[code] ?? null;
  const flight = (id: string, overrides: Partial<SlotFlight>): SlotFlight => ({
    id,
    departureFlightDate: "2026-09-27",
    destination: "BVA",
    std: at("2026-09-27T12:20:00Z"),
    etd: null,
    departureIfplid: null,
    departureCancelled: false,
    ...overrides,
  });

  it("finds the departure by destination, EOBD and EOBT", () => {
    const flights = [flight("fr-bva", {}), flight("fr-chq", { destination: "CHQ", std: at("2026-09-27T12:45:00Z") })];
    expect(matchSlot(parse(SAM).data, iataOf, flights)).toEqual({ matched: true, flightId: "fr-bva", byIfplid: false });
    expect(matchSlot(parse(SRM).data, iataOf, flights)).toEqual({ matched: true, flightId: "fr-chq", byIfplid: false });
  });

  it("takes the flight plan id first, so a later SRM finds its flight", () => {
    const flights = [flight("known", { destination: "CHQ", departureIfplid: "AA87996388", std: at("2026-09-27T18:00:00Z") })];
    expect(matchSlot(parse(SRM).data, iataOf, flights)).toEqual({ matched: true, flightId: "known", byIfplid: true });
  });

  it("uses the estimated departure within two hours", () => {
    const flights = [flight("late", { std: at("2026-09-27T09:00:00Z"), etd: at("2026-09-27T12:00:00Z") })];
    expect(matchSlot(parse(SAM).data, iataOf, flights)).toMatchObject({ matched: true, flightId: "late" });
    expect(matchSlot(parse(SAM).data, iataOf, [flight("far", { std: at("2026-09-27T15:00:00Z") })])).toEqual({ matched: false, reason: "none" });
  });

  it("leaves it unmatched when it is not clear", () => {
    const twins = [flight("a", {}), flight("b", { std: at("2026-09-27T12:50:00Z") })];
    expect(matchSlot(parse(SAM).data, iataOf, twins)).toEqual({ matched: false, reason: "many" });
    expect(matchSlot(parse(SAM).data, () => null, twins)).toEqual({ matched: false, reason: "noAirport" });
    expect(matchSlot(parse(SAM.replace("LHBP", "LOWW")).data, iataOf, twins)).toEqual({ matched: false, reason: "notHome" });
  });
});
