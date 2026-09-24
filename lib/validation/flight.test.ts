import { describe, expect, it } from "vitest";
import { fieldErrors } from "@/lib/validation/form";
import { flightSchema, type FlightFormInput } from "@/lib/validation/flight";

const valid: FlightFormInput = {
  templateId: "t1",
  inboundFlightNumber: " zz 1101 ",
  outboundFlightNumber: "ZZ1102",
  stand: " 31 ",
  sta: "2026-09-22T07:30",
  eta: "",
  std: "2026-09-22T07:55",
  etd: "2026-09-22T08:05",
};

const noArrival = { inboundFlightNumber: "", sta: "", eta: "" };
const noDeparture = { outboundFlightNumber: "", std: "", etd: "" };

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
    expect(data.eta).toBeNull();
    expect(data.etd?.toISOString()).toBe("2026-09-22T06:05:00.000Z");
  });

  it("requires a template and a stand", () => {
    expect(Object.keys(errorsFor({ templateId: "", stand: "" })).sort()).toEqual(["stand", "templateId"]);
  });

  it("rejects malformed flight numbers and times", () => {
    expect(errorsFor({ inboundFlightNumber: "Z" })).toHaveProperty("inboundFlightNumber");
    expect(errorsFor({ outboundFlightNumber: "ZZ-11" })).toHaveProperty("outboundFlightNumber");
    expect(errorsFor({ eta: "tomorrow" })).toHaveProperty("eta");
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
    expect(data.etd).toBeNull();
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
    expect(errorsFor({ std: "", etd: "" })).toHaveProperty("std");
    expect(errorsFor({ outboundFlightNumber: "" })).toHaveProperty("outboundFlightNumber");
  });

  it("allows an estimate only with its own part", () => {
    expect(errorsFor({ ...noArrival, eta: "2026-09-22T07:40" })).toHaveProperty("eta");
    expect(errorsFor({ ...noDeparture, etd: "2026-09-22T08:05" })).toHaveProperty("etd");
  });
});
