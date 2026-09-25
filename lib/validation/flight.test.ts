import { describe, expect, it } from "vitest";
import { fieldErrors } from "@/lib/validation/form";
import { flightSchema, type FlightFormInput } from "@/lib/validation/flight";

const valid: FlightFormInput = {
  airlineId: "a1",
  inboundFlightNumber: " zz 1101 ",
  outboundFlightNumber: "ZZ1102",
  stand: " 31 ",
  sta: "2026-09-22T07:30",
  std: "2026-09-22T07:55",
};

const noArrival = { inboundFlightNumber: "", sta: "" };
const noDeparture = { outboundFlightNumber: "", std: "" };

function errorsFor(input: Partial<FlightFormInput>) {
  const result = flightSchema.safeParse({ ...valid, ...input });
  return result.success ? {} : fieldErrors(result.error);
}

describe("flight form validation", () => {
  it("normalises flight numbers and converts local times to UTC", () => {
    const data = flightSchema.parse(valid);
    expect(data.inboundFlightNumber).toBe("ZZ1101");
    expect(data.stand).toBe("31");
    expect(data.sta?.toISOString()).toBe("2026-09-22T05:30:00.000Z");
    expect(data.std?.toISOString()).toBe("2026-09-22T05:55:00.000Z");
  });

  it("requires an airline, but the stand can wait", () => {
    expect(Object.keys(errorsFor({ airlineId: "", stand: "" }))).toEqual(["airlineId"]);
    expect(flightSchema.parse({ ...valid, stand: " " }).stand).toBeNull();
    expect(errorsFor({ stand: "x".repeat(11) })).toHaveProperty("stand");
  });

  it("rejects malformed flight numbers and times", () => {
    expect(errorsFor({ inboundFlightNumber: "Z" })).toHaveProperty("inboundFlightNumber");
    expect(errorsFor({ outboundFlightNumber: "ZZ-11" })).toHaveProperty("outboundFlightNumber");
    expect(errorsFor({ sta: "tomorrow" })).toHaveProperty("sta");
  });

  it("requires STD to be after STA when both parts exist", () => {
    expect(errorsFor({ std: "2026-09-22T07:30" })).toHaveProperty("std");
    expect(errorsFor({ std: "2026-09-22T07:31" })).toEqual({});
  });
});

describe("one-sided flights (rule 11)", () => {
  it("accepts an arrival-only flight", () => {
    const data = flightSchema.parse({ ...valid, ...noDeparture });
    expect(data.outboundFlightNumber).toBeNull();
    expect(data.std).toBeNull();
  });

  it("accepts a departure-only flight", () => {
    const data = flightSchema.parse({ ...valid, ...noArrival });
    expect(data.inboundFlightNumber).toBeNull();
    expect(data.sta).toBeNull();
    expect(data.std?.toISOString()).toBe("2026-09-22T05:55:00.000Z");
  });

  it("needs at least one part", () => {
    expect(Object.keys(errorsFor({ ...noArrival, ...noDeparture })).sort()).toEqual(["sta", "std"]);
  });

  it("needs both the flight number and the scheduled time of a part", () => {
    expect(errorsFor({ sta: "" })).toHaveProperty("sta");
    expect(errorsFor({ inboundFlightNumber: "" })).toHaveProperty("inboundFlightNumber");
    expect(errorsFor({ std: "" })).toHaveProperty("std");
    expect(errorsFor({ outboundFlightNumber: "" })).toHaveProperty("outboundFlightNumber");
  });
});
