import { describe, expect, it } from "vitest";
import { computeTimeline, windowsOverlap, type MilestoneDef } from "@/lib/turnaround";
import { buildSeedFlights, buildSeedShifts, SEED_MILESTONES, SEED_TEMPLATE, SEED_USERS } from "./seed-data";

const milestones: MilestoneDef[] = SEED_MILESTONES.map((m) => ({ ...m, id: m.code }));
const flights = buildSeedFlights("2026-09-22");

function shapeOf(flight: (typeof flights)[number]) {
  const recorded = new Map(flight.records.map((r) => [r.code, r.time]));
  return computeTimeline({ flight, params: SEED_TEMPLATE, milestones, recorded }).shape;
}

describe("seed data", () => {
  it("has one admin, one shift lead and two agents", () => {
    const roles = SEED_USERS.map((u) => u.role);
    expect(roles.filter((r) => r === "ADMIN")).toHaveLength(1);
    expect(roles.filter((r) => r === "SHIFT_LEAD")).toHaveLength(1);
    expect(roles.filter((r) => r === "AGENT")).toHaveLength(2);
  });

  it("has four flights including a quick and a long turnaround", () => {
    expect(flights).toHaveLength(4);
    const types = flights.map((f) => shapeOf(f).type);
    expect(types).toContain("QUICK");
    expect(types).toContain("LONG");
  });

  it("has two flights whose occupancy windows overlap", () => {
    const windows = flights.map((f) => shapeOf(f).windows);
    const overlapping = windows.some((a, i) =>
      windows.some((b, j) => i < j && a.some((wa) => b.some((wb) => windowsOverlap(wa, wb)))),
    );
    expect(overlapping).toBe(true);
  });

  it("has a flight with system ATA and ATD", () => {
    expect(flights.some((f) => f.ata && f.atd)).toBe(true);
  });

  it("only records milestones that exist in the template", () => {
    const codes = new Set(SEED_MILESTONES.map((m) => m.code));
    for (const record of flights.flatMap((f) => f.records)) {
      expect(codes.has(record.code), record.code).toBe(true);
    }
  });

  it("places the flights on the requested Budapest day", () => {
    expect(flights[0].sta.toISOString()).toBe("2026-09-22T05:30:00.000Z");
  });
});

describe("seed shifts", () => {
  const shifts = buildSeedShifts("2026-09-22");

  it("gives each demo agent one shift that does not overlap another of theirs", () => {
    for (const shift of shifts) {
      const others = shifts.filter((s) => s !== shift && s.agent === shift.agent);
      for (const other of others) {
        expect(windowsOverlap({ start: shift.startsAt, end: shift.endsAt }, { start: other.startsAt, end: other.endsAt })).toBe(false);
      }
    }
  });

  it("covers the occupancy windows of the assigned demo tasks", () => {
    for (const flight of flights) {
      const recorded = new Map(flight.records.map((r) => [r.code, r.time]));
      const { shape } = computeTimeline({ flight, params: SEED_TEMPLATE, milestones, recorded });
      for (const window of shape.windows) {
        const agent =
          window.part === "DEPARTURE_PART" && shape.type === "LONG" ? flight.departureAgent : flight.arrivalAgent;
        if (!agent) continue;
        const shift = shifts.find((s) => s.agent === agent);
        expect(shift, `${flight.inboundFlightNumber}: ${agent}`).toBeDefined();
        expect(window.start.getTime(), `${flight.inboundFlightNumber} start`).toBeGreaterThanOrEqual(shift!.startsAt.getTime());
        expect(window.end.getTime(), `${flight.inboundFlightNumber} end`).toBeLessThanOrEqual(shift!.endsAt.getTime());
      }
    }
  });
});
