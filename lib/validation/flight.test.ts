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

function errorsFor(input: Partial<FlightFormInput>) {
  const result = flightSchema.safeParse({ ...valid, ...input });
  return result.success ? {} : fieldErrors(result.error);
}

describe("flight form validation", () => {
  it("normalises flight numbers and converts local times to UTC", () => {
    const data = flightSchema.parse(valid);
    expect(data.inboundFlightNumber).toBe("ZZ1101");
    expect(data.stand).toBe("31");
    expect(data.sta.toISOString()).toBe("2026-09-22T05:30:00.000Z");
    expect(data.eta).toBeNull();
    expect(data.etd?.toISOString()).toBe("2026-09-22T06:05:00.000Z");
  });

  it("requires a template, stand, STA and STD", () => {
    expect(Object.keys(errorsFor({ templateId: "", stand: "", sta: "", std: "" })).sort()).toEqual([
      "sta",
      "stand",
      "std",
      "templateId",
    ]);
  });

  it("rejects malformed flight numbers and times", () => {
    expect(errorsFor({ inboundFlightNumber: "Z" })).toHaveProperty("inboundFlightNumber");
    expect(errorsFor({ outboundFlightNumber: "ZZ-11" })).toHaveProperty("outboundFlightNumber");
    expect(errorsFor({ eta: "tomorrow" })).toHaveProperty("eta");
  });

  it("requires STD to be after STA", () => {
    expect(errorsFor({ std: "2026-09-22T07:30" })).toHaveProperty("std");
    expect(errorsFor({ std: "2026-09-22T07:31" })).toEqual({});
  });
});
