import { describe, expect, it } from "vitest";
import { DEMO_MILESTONES, DEMO_TEMPLATE_PARAMS } from "@/lib/demo-template";
import {
  addMinutes,
  computeTimeline,
  diffMinutes,
  effectiveDepartureAgentId,
  windowsOverlap,
  type FlightTimes,
  type MilestoneDef,
} from "@/lib/turnaround";

const milestones: MilestoneDef[] = DEMO_MILESTONES.map((m) => ({ ...m, id: m.code }));
const sta = new Date("2026-09-22T10:00:00Z");

function shape(flight: FlightTimes, params = DEMO_TEMPLATE_PARAMS) {
  return computeTimeline({ flight, params, milestones, recorded: new Map() }).shape;
}

/** A flight with STA 10:00 and STD the given number of minutes later. */
function flightWithGround(minutes: number): FlightTimes {
  return { sta, std: addMinutes(sta, minutes) };
}

describe("turnaround type (rule 8)", () => {
  // With the demo template: break = (STD − 45) − (STA + 10 + 5) = ground time − 60.
  it("is quick one minute below the minimum break", () => {
    const s = shape(flightWithGround(60 + DEMO_TEMPLATE_PARAMS.minBreakMinutes - 1));
    expect(s.breakMinutes).toBe(DEMO_TEMPLATE_PARAMS.minBreakMinutes - 1);
    expect(s.type).toBe("QUICK");
  });

  it("is long exactly at the minimum break", () => {
    const s = shape(flightWithGround(60 + DEMO_TEMPLATE_PARAMS.minBreakMinutes));
    expect(s.breakMinutes).toBe(DEMO_TEMPLATE_PARAMS.minBreakMinutes);
    expect(s.type).toBe("LONG");
  });

  it("becomes quick when a late arrival eats up the break", () => {
    const flight = flightWithGround(90); // break 30 → long
    expect(shape(flight).type).toBe("LONG");
    expect(shape({ ...flight, ata: addMinutes(sta, 20) }).type).toBe("QUICK");
  });

  it("treats a zero minimum break as 'any non-negative gap is long'", () => {
    const params = { ...DEMO_TEMPLATE_PARAMS, minBreakMinutes: 0 };
    expect(shape(flightWithGround(60), params).type).toBe("LONG");
    expect(shape(flightWithGround(59), params).type).toBe("QUICK");
  });
});

describe("occupancy windows", () => {
  it("is a single 45-minute window for the demo quick turnaround", () => {
    const s = shape(flightWithGround(25));
    expect(s.windows).toHaveLength(1);
    const [w] = s.windows;
    expect(w.part).toBe("WHOLE");
    expect(w.start).toEqual(addMinutes(sta, -5));
    expect(diffMinutes(w.end, w.start)).toBe(45);
  });

  it("is two windows on a long turnaround", () => {
    const s = shape(flightWithGround(150)); // STD 12:30
    expect(s.windows).toEqual([
      { part: "ARRIVAL_PART", start: addMinutes(sta, -5), end: addMinutes(sta, 15) },
      { part: "DEPARTURE_PART", start: addMinutes(sta, 105), end: addMinutes(sta, 165) },
    ]);
  });

  it("never overlaps on a long turnaround, whatever the ground time", () => {
    let longCount = 0;
    for (let ground = 0; ground <= 600; ground++) {
      const s = shape(flightWithGround(ground));
      if (s.type !== "LONG") continue;
      longCount++;
      const [arrival, departure] = s.windows;
      expect(windowsOverlap(arrival, departure)).toBe(false);
      expect(arrival.end.getTime()).toBeLessThanOrEqual(departure.start.getTime());
    }
    expect(longCount).toBeGreaterThan(0);
  });

  it("treats windows as half-open, so touching windows do not overlap", () => {
    const a = { start: sta, end: addMinutes(sta, 30) };
    const b = { start: addMinutes(sta, 30), end: addMinutes(sta, 60) };
    expect(windowsOverlap(a, b)).toBe(false);
    expect(windowsOverlap(a, { start: addMinutes(sta, 29), end: addMinutes(sta, 60) })).toBe(true);
  });
});

describe("departure agent", () => {
  it("is the arrival agent on a quick turnaround", () => {
    expect(effectiveDepartureAgentId("QUICK", "anna", "bela")).toBe("anna");
    expect(effectiveDepartureAgentId("QUICK", null, "bela")).toBeNull();
  });

  it("is the assigned departure agent on a long turnaround", () => {
    expect(effectiveDepartureAgentId("LONG", "anna", "bela")).toBe("bela");
  });
});
