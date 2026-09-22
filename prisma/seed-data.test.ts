import { describe, expect, it } from "vitest";
import { computeTimeline, windowsOverlap, type MilestoneDef } from "@/lib/turnaround";
import { buildSeedFlights, SEED_MILESTONES, SEED_TEMPLATE, SEED_USERS } from "./seed-data";

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
