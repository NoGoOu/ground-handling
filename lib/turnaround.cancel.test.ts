import { describe, expect, it } from "vitest";
import { DEMO_MILESTONES, DEMO_TEMPLATE_PARAMS } from "@/lib/demo-template";
import { activeKind, computeTimeline, isRequiredMissing, type FlightTimes, type MilestoneDef } from "@/lib/turnaround";

// "Késés és törlés" (CLAUDE.md): a cancelled part stays visible, but leaves the
// occupancy, the turnaround type and the missing-milestone flags.

const milestones: MilestoneDef[] = DEMO_MILESTONES.map((m) => ({ ...m, id: m.code }));
const at = (hhmm: string) => new Date(`2026-09-24T${hhmm}:00Z`);

function timeline(flight: FlightTimes) {
  return computeTimeline({ flight, params: DEMO_TEMPLATE_PARAMS, milestones, recorded: new Map() });
}

// A quick turnaround: STD = STA + 25.
const quick: FlightTimes = { sta: at("10:00"), std: at("10:25") };

describe("active parts", () => {
  it("drops the cancelled parts, and nothing is left when both are cancelled", () => {
    expect(activeKind(quick)).toBe("TURNAROUND");
    expect(activeKind({ ...quick, arrivalCancelled: true })).toBe("DEPARTURE_ONLY");
    expect(activeKind({ ...quick, departureCancelled: true })).toBe("ARRIVAL_ONLY");
    expect(activeKind({ ...quick, arrivalCancelled: true, departureCancelled: true })).toBeNull();
  });
});

describe("cancelled arrival", () => {
  const t = timeline({ ...quick, sta: at("09:40"), eta: at("10:20"), arrivalCancelled: true });

  it("leaves a departure-only flight: the ETD, else STD, without the minimum turnaround", () => {
    // Without the cancellation, ETA 10:20 + 25 would push the departure to 10:45.
    expect(t.departureAnchor).toEqual(at("10:25"));
    expect(t.activeKind).toBe("DEPARTURE_ONLY");
    expect(t.shape.type).toBeNull();
    expect(t.shape.windows).toEqual([{ part: "DEPARTURE_PART", start: at("09:40"), end: at("10:40") }]);
  });

  it("keeps its milestones on show, but never flags them as missing", () => {
    const arrivalRows = t.rows.filter((row) => row.milestone.part === "ARRIVAL_PART");
    expect(arrivalRows.length).toBeGreaterThan(0);
    expect(arrivalRows.every((row) => row.cancelled)).toBe(true);
    const flagged = arrivalRows.filter((row) => isRequiredMissing(row, { now: at("23:00"), completed: true }));
    expect(flagged).toEqual([]);
  });

  it("still keeps the arrival anchor, so the flight stays on its day's list", () => {
    expect(t.arrivalAnchor).toEqual(at("10:20"));
  });
});

describe("cancelled departure", () => {
  const t = timeline({ ...quick, atd: at("10:40"), departureCancelled: true });

  it("leaves an arrival-only flight with no delay", () => {
    expect(t.activeKind).toBe("ARRIVAL_ONLY");
    expect(t.delayMinutes).toBeNull();
    expect(t.shape.windows).toEqual([{ part: "ARRIVAL_PART", start: at("09:55"), end: at("10:15") }]);
  });
});

describe("whole flight cancelled", () => {
  it("occupies nobody and has no type", () => {
    const t = timeline({ ...quick, arrivalCancelled: true, departureCancelled: true });
    expect(t.activeKind).toBeNull();
    expect(t.shape.type).toBeNull();
    expect(t.shape.windows).toEqual([]);
    expect(t.rows.every((row) => row.cancelled)).toBe(true);
  });
});
