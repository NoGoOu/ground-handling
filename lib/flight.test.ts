import { describe, expect, it } from "vitest";
import { DEMO_MILESTONES, DEMO_TEMPLATE_PARAMS } from "@/lib/demo-template";
import { flightLabel, lateness } from "@/lib/flight";
import { computeTimeline, type FlightTimes, type MilestoneDef } from "@/lib/turnaround";

const milestones: MilestoneDef[] = DEMO_MILESTONES.map((m) => ({ ...m, id: m.code }));
const at = (iso: string) => new Date(`${iso}:00Z`);

function latenessOf(flight: FlightTimes) {
  return lateness(flight, computeTimeline({ flight, params: DEMO_TEMPLATE_PARAMS, milestones, recorded: new Map() }));
}

describe("flight label", () => {
  it("joins the two flight numbers of a turnaround", () => {
    expect(flightLabel({ inboundFlightNumber: "ZZ1101", outboundFlightNumber: "ZZ1102" })).toBe("ZZ1101 / ZZ1102");
  });

  it("shows the single flight number of a one-sided flight", () => {
    expect(flightLabel({ inboundFlightNumber: "ZZ1511", outboundFlightNumber: null })).toBe("ZZ1511");
    expect(flightLabel({ inboundFlightNumber: null, outboundFlightNumber: "ZZ1612" })).toBe("ZZ1612");
  });
});

describe("late flight", () => {
  const onTime: FlightTimes = { sta: at("2026-09-24T10:00"), std: at("2026-09-24T11:00") };

  it("is not late while everything runs to schedule", () => {
    expect(latenessOf(onTime)).toEqual({ late: false, scheduled: null });
  });

  it("is late with a later ETA, and shows the scheduled arrival", () => {
    expect(latenessOf({ ...onTime, eta: at("2026-09-24T10:20") })).toEqual({
      late: true,
      scheduled: at("2026-09-24T10:00"),
    });
  });

  it("is late with a later ETD alone, and then shows the scheduled departure", () => {
    expect(latenessOf({ ...onTime, etd: at("2026-09-24T11:30") })).toEqual({
      late: true,
      scheduled: at("2026-09-24T11:00"),
    });
  });

  it("counts the effective ATD as the departure", () => {
    expect(latenessOf({ ...onTime, atd: at("2026-09-24T11:05") }).late).toBe(true);
  });

  it("keeps the original day of a flight that is days late", () => {
    const result = latenessOf({ ...onTime, eta: at("2026-09-29T10:00"), etd: at("2026-09-29T11:00") });
    expect(result.scheduled).toEqual(at("2026-09-24T10:00"));
  });

  it("ignores a cancelled part", () => {
    expect(latenessOf({ ...onTime, eta: at("2026-09-24T10:20"), arrivalCancelled: true }).late).toBe(false);
    expect(latenessOf({ ...onTime, etd: at("2026-09-24T11:30"), departureCancelled: true }).late).toBe(false);
  });

  it("works on a one-sided flight", () => {
    expect(latenessOf({ sta: null, std: at("2026-09-24T11:00"), etd: at("2026-09-24T11:10") }).late).toBe(true);
    expect(latenessOf({ sta: at("2026-09-24T10:00"), std: null }).late).toBe(false);
  });
});
