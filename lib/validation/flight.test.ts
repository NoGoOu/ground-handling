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

describe("what messages are matched by (7. mérföldkő)", () => {
  it("normalises stations and registrations", () => {
    const data = flightSchema.parse({
      ...valid,
      origin: " stn ",
      destination: "osr",
      arrivalRegistration: "ha-lya",
      departureRegistration: "HA LYB",
    });
    expect(data.origin).toBe("STN");
    expect(data.destination).toBe("OSR");
    expect(data.arrivalRegistration).toBe("HALYA");
    expect(data.departureRegistration).toBe("HALYB");
  });

  it("takes the operating day from the scheduled time in Budapest unless given", () => {
    // 00:30 in Budapest is still the previous day in UTC.
    const data = flightSchema.parse({ ...valid, sta: "2026-09-22T00:30", std: "2026-09-22T01:30" });
    expect(data.arrivalFlightDate?.toISOString().slice(0, 10)).toBe("2026-09-22");
    const overnight = flightSchema.parse({ ...valid, arrivalFlightDate: "2026-09-21" });
    expect(overnight.arrivalFlightDate?.toISOString().slice(0, 10)).toBe("2026-09-21");
    expect(overnight.departureFlightDate?.toISOString().slice(0, 10)).toBe("2026-09-22");
  });

  it("leaves them empty on a missing part", () => {
    const data = flightSchema.parse({ ...valid, ...noDeparture, destination: "OSR", departureRegistration: "HALYA" });
    expect(data.destination).toBeNull();
    expect(data.departureRegistration).toBeNull();
    expect(data.departureFlightDate).toBeNull();
  });

  it("rejects malformed values", () => {
    expect(errorsFor({ origin: "BUDA" })).toHaveProperty("origin");
    expect(errorsFor({ arrivalRegistration: "X".repeat(11) })).toHaveProperty("arrivalRegistration");
    expect(errorsFor({ departureFlightDate: "2026-13-40" })).toHaveProperty("departureFlightDate");
  });
});
