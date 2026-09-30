import { describe, expect, it } from "vitest";
import { staffingDay } from "@/lib/staffing/day";
import { demandWindows, type DemandTask } from "@/lib/staffing/demand";
import type { StaffSegment } from "@/lib/staffing/roster";
import { isShort, summaryOf } from "@/lib/staffing/summary";
import { addDays, formatTime } from "@/lib/time";
import { computeTimeline, type MilestoneDef } from "@/lib/turnaround";
import {
  buildSeedFlights,
  SEED_MILESTONES,
  SEED_PLACEHOLDER_MILESTONES,
  SEED_PLACEHOLDER_TASK_TYPE,
  SEED_PLACEHOLDER_TEMPLATE,
  SEED_TEMPLATE,
} from "./seed-data";
import { SEED_SEGMENT_TYPES, SEED_SHIFTS, segmentTimes } from "./seed-roster";

// The staffing demand of the demo day (CLAUDE.md, 9. mérföldkő, 7. lépés):
// the seed must show at least one short band, so that the view can be tried.

const DAY = "2026-09-22";
const withIds = (milestones: readonly Omit<MilestoneDef, "id">[]): MilestoneDef[] => milestones.map((m) => ({ ...m, id: m.code }));

/** Every demo flight has a task of both task types of the demo airline. */
function seedTasks(): DemandTask[] {
  return buildSeedFlights(DAY).flatMap((flight) => {
    const recorded = new Map(flight.records.map((r) => [r.code, r.time]));
    const base = computeTimeline({ flight, params: SEED_TEMPLATE, milestones: withIds(SEED_MILESTONES), recorded });
    const placeholder = computeTimeline({
      flight,
      params: SEED_PLACEHOLDER_TEMPLATE,
      milestones: withIds(SEED_PLACEHOLDER_MILESTONES),
      recorded: new Map(),
      templateParts: { arrival: SEED_PLACEHOLDER_TEMPLATE.arrivalPart, departure: SEED_PLACEHOLDER_TEMPLATE.departurePart },
      // The primary task's ATA/ATD records are the flight's (5. mérföldkő).
      primaryRecords: { ata: recorded.get("ATA") ?? null, atd: recorded.get("ATD") ?? null },
    });
    return [
      { taskType: "ALAP", windows: base.shape.windows },
      { taskType: SEED_PLACEHOLDER_TASK_TYPE.code, windows: placeholder.shape.windows },
    ];
  });
}

/** The actual layer of the seeded roster. */
function seedSegments(): StaffSegment[] {
  const operative = new Map<string, boolean>(SEED_SEGMENT_TYPES.map((type) => [type.code, type.operative]));
  return SEED_SHIFTS.filter((shift) => shift.layers.includes("ACTUAL")).flatMap((shift) =>
    shift.segments.map((segment) => ({
      userId: shift.agent,
      ...segmentTimes(DAY, segment),
      operative: operative.get(segment.typeCode)!,
      createBlock: segment.createBlock ?? false,
      travelBeforeMinutes: segment.travelBeforeMinutes ?? 0,
      travelAfterMinutes: segment.travelAfterMinutes ?? 0,
    })),
  );
}

describe("the staffing demand of the demo day", () => {
  const windows = demandWindows(seedTasks());
  const day = staffingDay(DAY, windows, seedSegments());
  const summary = summaryOf(day);
  const at = (hhmm: string) => day.bands.find((band) => formatTime(band.start) === hhmm)!;

  it("has work for both task types and an actual roster", () => {
    expect(day.taskTypes).toEqual(["ALAP", "HLY"]);
    expect(day.hasRoster).toBe(true);
  });

  it("has at least one short band, and one with a surplus", () => {
    expect(day.bands.some((band) => isShort(day, band))).toBe(true);
    expect(day.bands.some((band) => band.balance > 0)).toBe(true);
  });

  it("peaks in the afternoon, when two turnarounds overlap and one agent is on shift", () => {
    expect(summary.peak).toBe(4);
    expect(formatTime(summary.peakAt!)).toBe("16:15");
    expect(at("16:15")).toMatchObject({ total: 4, byType: { ALAP: 2, HLY: 2 }, rostered: 1, balance: -3 });
    expect(summary.shortage).toBe(3);
    expect(formatTime(summary.shortageAt!)).toBe("16:15");
  });

  it("is covered at noon, when both agents are on shift", () => {
    expect(at("12:00")).toMatchObject({ total: 2, rostered: 2, balance: 0 });
  });

  it("leaves the second agent out while the training block and its travel time last", () => {
    // Oktatás 09:00–10:30 with 20 minutes of travel each way; the shift starts at 11:00.
    expect(at("10:45").rostered).toBe(1);
    expect(at("11:00").rostered).toBe(2);
  });

  it("has a roster the day after, but no demand yet", () => {
    const next = staffingDay(addDays(DAY, 1), windows, seedSegments());
    expect(next.hasRoster).toBe(true);
    expect(summaryOf(next)).toMatchObject({ peak: 0, shortBands: 0 });
  });

  it("has no actual roster two days later: nothing is marked short there", () => {
    const later = staffingDay(addDays(DAY, 2), windows, seedSegments());
    expect(later.hasRoster).toBe(false);
    expect(later.bands.some((band) => isShort(later, band))).toBe(false);
  });
});
