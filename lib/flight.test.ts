import { describe, expect, it } from "vitest";
import { flightLabel } from "@/lib/flight";

describe("flight label", () => {
  it("joins the two flight numbers of a turnaround", () => {
    expect(flightLabel({ inboundFlightNumber: "ZZ1101", outboundFlightNumber: "ZZ1102" })).toBe("ZZ1101 / ZZ1102");
  });

  it("shows the single flight number of a one-sided flight", () => {
    expect(flightLabel({ inboundFlightNumber: "ZZ1511", outboundFlightNumber: null })).toBe("ZZ1511");
    expect(flightLabel({ inboundFlightNumber: null, outboundFlightNumber: "ZZ1612" })).toBe("ZZ1612");
  });
});
