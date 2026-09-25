import { describe, expect, it } from "vitest";
import { DEMO_MILESTONES, DEMO_TEMPLATE_PARAMS } from "@/lib/demo-template";
import {
  BOTH_PARTS,
  computeTimeline,
  isRequiredMissing,
  partsKind,
  type FlightTimes,
  type MilestoneDef,
  type TimelineInput,
} from "@/lib/turnaround";

// Tasks per task type (CLAUDE.md, 5. mérföldkő): a task's parts are those its
// template and its flight both have; the anchors are the flight's; the primary
// task's ATA/ATD records are the flight's when the system has none.

const milestones: MilestoneDef[] = DEMO_MILESTONES.map((m) => ({ ...m, id: m.code }));
const at = (hhmm: string) => new Date(`2026-09-24T${hhmm}:00Z`);
const DEPARTURE_ONLY_TEMPLATE = { arrival: false, departure: true };
const ARRIVAL_ONLY_TEMPLATE = { arrival: true, departure: false };

function timeline(flight: FlightTimes, extra: Partial<TimelineInput> = {}) {
  return computeTimeline({ flight, params: DEMO_TEMPLATE_PARAMS, milestones, recorded: new Map(), ...extra });
}

const quick: FlightTimes = { sta: at("10:00"), std: at("10:25") };
const long: FlightTimes = { sta: at("10:00"), std: at("12:00") };

describe("the parts of a task", () => {
  it("are those the template and the flight both have", () => {
    expect(partsKind("TURNAROUND", BOTH_PARTS)).toBe("TURNAROUND");
    expect(partsKind("TURNAROUND", DEPARTURE_ONLY_TEMPLATE)).toBe("DEPARTURE_ONLY");
    expect(partsKind("ARRIVAL_ONLY", DEPARTURE_ONLY_TEMPLATE)).toBeNull();
    expect(partsKind(null, BOTH_PARTS)).toBeNull();
  });

  it("leave a two-part template on a turnaround exactly as before", () => {
    expect(timeline(long, { templateParts: BOTH_PARTS })).toEqual(timeline(long));
  });
});

describe("a departure-only template on a turnaround", () => {
  // The aircraft arrives late: ETA 10:20, so the departure anchor is 10:45 (rule 2).
  const late = { ...quick, eta: at("10:20") };
  const t = timeline(late, { templateParts: DEPARTURE_ONLY_TEMPLATE });

  it("has only the departure milestones, but the flight's anchors", () => {
    expect(t.kind).toBe("DEPARTURE_ONLY");
    expect(t.rows.map((r) => r.milestone.code)).toEqual([
      "FIRST_PAX_IN",
      "LAST_PAX_IN",
      "CABIN_DOOR_CLOSE",
      "ALL_DOOR_CLOSE",
      "ATD",
    ]);
    expect(t.arrivalAnchor).toEqual(at("10:20"));
    expect(t.departureAnchor).toEqual(at("10:45"));
    expect(t.rows.at(-1)?.planned).toEqual(at("10:45"));
  });

  it("occupies one window, by the departure formula", () => {
    expect(t.shape.type).toBeNull();
    expect(t.shape.windows).toEqual([{ part: "DEPARTURE_PART", start: at("10:00"), end: at("11:00") }]);
  });

  it("has nothing left when the departure is cancelled", () => {
    const cancelled = timeline({ ...long, departureCancelled: true }, { templateParts: DEPARTURE_ONLY_TEMPLATE });
    expect(cancelled.kind).toBe("DEPARTURE_ONLY");
    expect(cancelled.activeKind).toBeNull();
    expect(cancelled.shape.windows).toEqual([]);
  });
});

describe("an arrival-only template", () => {
  it("on a long turnaround has the arrival window only", () => {
    const t = timeline(long, { templateParts: ARRIVAL_ONLY_TEMPLATE });
    expect(t.kind).toBe("ARRIVAL_ONLY");
    expect(t.shape.windows).toEqual([{ part: "ARRIVAL_PART", start: at("09:55"), end: at("10:15") }]);
  });

  it("on a departure-only flight has nothing to do", () => {
    const t = timeline({ sta: null, std: at("12:00") }, { templateParts: ARRIVAL_ONLY_TEMPLATE });
    expect(t.kind).toBeNull();
    expect(t.activeKind).toBeNull();
    expect(t.rows).toEqual([]);
    expect(t.shape.windows).toEqual([]);
  });
});

describe("the flight's ATA and ATD with several tasks", () => {
  const ownAta = new Map([["ATA", at("10:03")]]);

  it("are the primary task's own records (as before)", () => {
    const primary = timeline(quick, { recorded: ownAta });
    expect(primary.effectiveAta).toEqual(at("10:03"));
    expect(primary.rows[0]).toMatchObject({ actual: at("10:03"), fromFlight: false });
  });

  it("come from the primary task on the other tasks; their own record is kept but does not count", () => {
    const other = timeline(quick, { recorded: ownAta, primaryRecords: { ata: at("10:01"), atd: null } });
    expect(other.effectiveAta).toEqual(at("10:01"));
    expect(other.arrivalAnchor).toEqual(at("10:01"));
    expect(other.rows[0]).toMatchObject({
      recorded: at("10:03"),
      primaryValue: at("10:01"),
      actual: at("10:01"),
      fromFlight: true,
    });
  });

  it("stay empty on the other tasks while the primary task has no record", () => {
    const other = timeline(quick, { recorded: ownAta, primaryRecords: { ata: null, atd: null } });
    expect(other.effectiveAta).toBeNull();
    expect(other.arrivalAnchor).toEqual(at("10:00"));
    expect(other.rows[0].actual).toBeNull();
    // The flight's ATA is not this task's to record: never flagged as missing here.
    expect(isRequiredMissing(other.rows[0], { now: at("12:00"), completed: true })).toBe(false);
  });

  it("are the system's values first, on every task (rule 9)", () => {
    const system = { ...quick, ata: at("10:02"), atd: at("10:30") };
    const other = timeline(system, { primaryRecords: { ata: at("10:01"), atd: at("10:29") } });
    expect(other.effectiveAta).toEqual(at("10:02"));
    expect(other.effectiveAtd).toEqual(at("10:30"));
    expect(other.delayMinutes).toBe(5);
  });
});
