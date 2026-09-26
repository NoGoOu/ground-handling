import { describe, expect, it } from "vitest";
import { isNil, parseHeader, parseHeaderDate } from "@/lib/telex/header";
import { SAMPLES } from "@/lib/telex/samples.fixture";

const headerOf = (sample: string) => parseHeader(sample.split("\n")[1]);

describe("message headers", () => {
  it("reads flight, day, registration and station of the samples", () => {
    expect(headerOf(SAMPLES.MVT_ET)).toEqual({
      flightNumber: "ET3365",
      dateText: "12",
      date: { day: 12 },
      registration: "ETBAB",
      fields: ["BUD"],
    });
    expect(headerOf(SAMPLES.UCM_P7_IN)).toMatchObject({ flightNumber: "P71103", date: { day: 12 }, fields: ["BUD"] });
  });

  it("keeps the type's own fields: LDM configuration and crew, CPM weight and station", () => {
    expect(headerOf(SAMPLES.LDM_P7)).toMatchObject({ registration: "URNPA", fields: ["0Y", "2/1"] });
    expect(headerOf(SAMPLES.LDM_EW)).toMatchObject({ flightNumber: "EW2783", date: { day: 3 }, fields: ["Y150", "2/3"] });
    expect(headerOf(SAMPLES.CPM_P7)).toMatchObject({ fields: ["1983", "BUD"] });
  });

  it("reads a full date", () => {
    expect(headerOf(SAMPLES.CPM_CZ)).toEqual({
      flightNumber: "CZ2557",
      dateText: "19SEP26",
      date: { date: "2026-09-19" },
      registration: "B2041",
      fields: ["4/1", "CANBUD"],
    });
    expect(parseHeaderDate("29FEB28")).toEqual({ date: "2028-02-29" });
    expect(parseHeaderDate("29FEB27")).toBeNull();
    expect(parseHeaderDate("32")).toBeNull();
  });

  it("rejects a line that is not a header", () => {
    expect(parseHeader("AD162036/162049 EA162132 OSR")).toBeNull();
    expect(parseHeader("OUT")).toBeNull();
    expect(parseHeader("12345/16.URNPA.BUD")).toBeNull();
  });
});

describe("the none of the messages", () => {
  it("knows /N, /NIL and .NIL", () => {
    expect(["N", "NIL", "/N", "/NIL", ".NIL", " nil "].every(isNil)).toBe(true);
    expect(isNil("NILS")).toBe(false);
    expect(isNil("BUD")).toBe(false);
  });
});
