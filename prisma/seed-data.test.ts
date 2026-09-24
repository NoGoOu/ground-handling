import { describe, expect, it } from "vitest";
import { computeTimeline, flightKind, windowsOverlap, type MilestoneDef } from "@/lib/turnaround";
import { buildSeedFlights, SEED_MILESTONES, SEED_TEMPLATE, SEED_USERS } from "./seed-data";
import { SEED_SHIFTS, segmentTimes, type SeedShift } from "./seed-roster";

const milestones: MilestoneDef[] = SEED_MILESTONES.map((m) => ({ ...m, id: m.code }));
const flights = buildSeedFlights("2026-09-22");

function shapeOf(flight: (typeof flights)[number]) {
  const recorded = new Map(flight.records.map((r) => [r.code, r.time]));
  return computeTimeline({ flight, params: SEED_TEMPLATE, milestones, recorded }).shape;
}

describe("seed data", () => {
  it("has one admin, one shift lead, one planner and two agents", () => {
    const roles = SEED_USERS.flatMap((u) => u.roles);
    expect(roles.filter((r) => r === "Admin")).toHaveLength(1);
    expect(roles.filter((r) => r === "Műszakvezető")).toHaveLength(1);
    expect(roles.filter((r) => r === "Tervező")).toHaveLength(1);
    expect(roles.filter((r) => r === "Ügynök")).toHaveLength(2);
    expect(SEED_USERS.filter((u) => u.agent)).toHaveLength(2);
  });

  it("has six flights: a quick and a long turnaround, an arrival-only and a departure-only flight", () => {
    expect(flights).toHaveLength(6);
    const types = flights.map((f) => shapeOf(f).type);
    expect(types).toContain("QUICK");
    expect(types).toContain("LONG");
    const kinds = flights.map((f) => flightKind(f));
    expect(kinds).toContain("ARRIVAL_ONLY");
    expect(kinds).toContain("DEPARTURE_ONLY");
  });

  it("gives a one-sided flight only the agent of its own part", () => {
    for (const flight of flights) {
      const kind = flightKind(flight);
      if (kind === "ARRIVAL_ONLY") expect(flight.departureAgent).toBeNull();
      if (kind === "DEPARTURE_ONLY") expect(flight.arrivalAgent).toBeNull();
    }
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
    expect(flights[0].sta?.toISOString()).toBe("2026-09-22T05:30:00.000Z");
  });
});

const DAY = "2026-09-22";

interface SeedWindow {
  agent: string;
  start: Date;
  end: Date;
  operative: boolean;
}

/** Every segment of one layer as a concrete window. */
function windowsOf(layer: "PUBLISHED" | "ACTUAL"): SeedWindow[] {
  return SEED_SHIFTS.filter((shift: SeedShift) => shift.layers.includes(layer)).flatMap((shift) =>
    shift.segments.map((segment) => ({
      agent: shift.agent as string,
      ...segmentTimes(DAY, segment),
      operative: segment.typeCode === "SHIFT",
    })),
  );
}

describe("seed roster", () => {
  const actual = windowsOf("ACTUAL");
  const published = windowsOf("PUBLISHED");

  it("never lets two segments of the same agent overlap", () => {
    for (const layer of [actual, published]) {
      for (const window of layer) {
        for (const other of layer) {
          if (window === other || window.agent !== other.agent) continue;
          expect(windowsOverlap(window, other), `${window.agent} ${window.start.toISOString()}`).toBe(false);
        }
      }
    }
  });

  it("has a non-operative segment with travel time that makes a block", () => {
    const block = SEED_SHIFTS.flatMap((s) => s.segments).find((segment) => segment.createBlock);
    expect(block).toBeDefined();
    expect(block!.typeCode).not.toBe("SHIFT");
    expect(block!.travelBeforeMinutes).toBeGreaterThan(0);
    expect(block!.travelAfterMinutes).toBeGreaterThan(0);
  });

  it("has a day where the actual roster differs from the published one", () => {
    const key = (w: SeedWindow) => `${w.agent} ${w.start.toISOString()} ${w.end.toISOString()}`;
    const publishedKeys = new Set(published.map(key));
    expect(actual.some((w) => !publishedKeys.has(key(w)))).toBe(true);
  });

  it("covers the occupancy windows of the assigned demo tasks with operative segments", () => {
    for (const flight of flights) {
      const recorded = new Map(flight.records.map((r) => [r.code, r.time]));
      const { shape } = computeTimeline({ flight, params: SEED_TEMPLATE, milestones, recorded });
      for (const window of shape.windows) {
        // A quick turnaround's single window is the arrival agent's (rule 8).
        const agent = window.part === "DEPARTURE_PART" ? flight.departureAgent : flight.arrivalAgent;
        if (!agent) continue;
        const covering = actual.find(
          (segment) =>
            segment.operative &&
            segment.agent === agent &&
            segment.start.getTime() <= window.start.getTime() &&
            segment.end.getTime() >= window.end.getTime(),
        );
        expect(covering, `${flight.inboundFlightNumber}: ${agent}`).toBeDefined();
      }
    }
  });
});
