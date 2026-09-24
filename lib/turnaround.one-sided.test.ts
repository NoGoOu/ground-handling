import { describe, expect, it } from "vitest";
import { DEMO_MILESTONES, DEMO_TEMPLATE_PARAMS } from "@/lib/demo-template";
import {
  computeTimeline,
  flightKind,
  hasPart,
  isRequiredMissing,
  milestonesFor,
  type FlightTimes,
  type MilestoneDef,
} from "@/lib/turnaround";

// Rule 11 (CLAUDE.md): arrival-only and departure-only flights.

const milestones: MilestoneDef[] = DEMO_MILESTONES.map((m) => ({ ...m, id: m.code }));
const at = (hhmm: string) => new Date(`2026-09-24T${hhmm}:00Z`);

function timeline(flight: FlightTimes, recorded = new Map<string, Date>()) {
  return computeTimeline({ flight, params: DEMO_TEMPLATE_PARAMS, milestones, recorded });
}

const plannedByCode = (t: ReturnType<typeof timeline>) =>
  Object.fromEntries(t.rows.map((row) => [row.milestone.code, row.planned]));

describe("flight kind", () => {
  it("tells the three kinds apart by the scheduled times", () => {
    expect(flightKind({ sta: at("10:00"), std: at("11:00") })).toBe("TURNAROUND");
    expect(flightKind({ sta: at("10:00"), std: null })).toBe("ARRIVAL_ONLY");
    expect(flightKind({ sta: null, std: at("11:00") })).toBe("DEPARTURE_ONLY");
    expect(() => flightKind({ sta: null, std: null })).toThrow();
  });

  it("keeps only the milestones of the parts the flight has", () => {
    expect(hasPart("ARRIVAL_ONLY", "DEPARTURE_PART")).toBe(false);
    expect(hasPart("DEPARTURE_ONLY", "DEPARTURE_PART")).toBe(true);
    expect(milestonesFor("ARRIVAL_ONLY", milestones).map((m) => m.code)).toEqual([
      "ATA",
      "FRONT_DOOR_OPEN",
      "BACK_DOOR_OPEN",
      "FIRST_PAX_OUT",
      "LAST_PAX_OUT",
    ]);
    expect(milestonesFor("TURNAROUND", milestones)).toHaveLength(milestones.length);
  });
});

describe("arrival-only flight", () => {
  const flight: FlightTimes = { sta: at("10:00"), std: null };

  it("has the arrival milestones only, counted from the arrival anchor", () => {
    const t = timeline(flight);
    expect(t.kind).toBe("ARRIVAL_ONLY");
    expect(t.rows.map((row) => row.milestone.code)).not.toContain("ATD");
    expect(plannedByCode(t)).toEqual({
      ATA: at("10:00"),
      FRONT_DOOR_OPEN: at("10:01"),
      BACK_DOOR_OPEN: at("10:01"),
      FIRST_PAX_OUT: at("10:02"),
      LAST_PAX_OUT: at("10:10"),
    });
  });

  it("has no departure anchor, delay or turnaround type", () => {
    const t = timeline(flight);
    expect(t.departureAnchor).toBeNull();
    expect(t.delayMinutes).toBeNull();
    expect(t.shape.type).toBeNull();
  });

  it("uses rule 1 for the arrival anchor, the agent's ATA included", () => {
    expect(timeline({ ...flight, eta: at("10:20") }).arrivalAnchor).toEqual(at("10:20"));
    expect(timeline(flight, new Map([["ATA", at("10:07")]])).arrivalAnchor).toEqual(at("10:07"));
  });

  it("occupies one window: arrival − travel → last arrival milestone + travel", () => {
    expect(timeline(flight).shape.windows).toEqual([
      { part: "ARRIVAL_PART", start: at("09:55"), end: at("10:15") },
    ]);
  });
});

describe("departure-only flight", () => {
  const flight: FlightTimes = { sta: null, std: at("11:00") };

  it("has the departure milestones only, counted from STD", () => {
    const t = timeline(flight);
    expect(t.kind).toBe("DEPARTURE_ONLY");
    expect(t.arrivalAnchor).toBeNull();
    expect(plannedByCode(t)).toEqual({
      FIRST_PAX_IN: at("10:30"),
      LAST_PAX_IN: at("10:55"),
      CABIN_DOOR_CLOSE: at("10:57"),
      ALL_DOOR_CLOSE: at("10:59"),
      ATD: at("11:00"),
    });
  });

  it("anchors on the ETD when there is one, without a minimum turnaround", () => {
    expect(timeline({ ...flight, etd: at("11:20") }).departureAnchor).toEqual(at("11:20"));
    expect(timeline(flight).departureAnchor).toEqual(at("11:00"));
  });

  it("counts the delay by rule 7 and has no turnaround type", () => {
    const t = timeline({ ...flight, atd: at("11:12") });
    expect(t.delayMinutes).toBe(12);
    expect(t.shape.type).toBeNull();
  });

  it("occupies one window: anchor − report − travel → anchor + post-departure", () => {
    expect(timeline(flight).shape.windows).toEqual([
      { part: "DEPARTURE_PART", start: at("10:15"), end: at("11:15") },
    ]);
  });

  it("never flags the missing arrival milestones", () => {
    const t = timeline(flight);
    const now = at("23:00");
    const missing = t.rows.filter((row) => isRequiredMissing(row, { now, completed: true }));
    expect(missing.every((row) => row.milestone.part === "DEPARTURE_PART")).toBe(true);
    expect(t.rows.some((row) => row.milestone.code === "ATA")).toBe(false);
  });
});

describe("a milestone pointing at the missing anchor", () => {
  it("counts from the anchor the flight has, and still keeps the order (rule 3)", () => {
    const crossAnchored: MilestoneDef = {
      id: "BAGS_LAST",
      order: 5.5,
      code: "BAGS_LAST",
      name: "Last bag",
      anchor: "DEPARTURE",
      offsetMinutes: 5,
      required: false,
      part: "ARRIVAL_PART",
    };
    const t = computeTimeline({
      flight: { sta: at("10:00"), std: null },
      params: DEMO_TEMPLATE_PARAMS,
      milestones: [...milestones, crossAnchored],
      recorded: new Map(),
    });
    // Arrival + 5 would be 10:05, but the last pax out before it is at 10:10.
    expect(plannedByCode(t).BAGS_LAST).toEqual(at("10:10"));
  });
});
