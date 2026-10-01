import { blockWindow, castsBlock, mergeWindows, type BlockSource } from "@/lib/board";
import { changePoints, countAt } from "@/lib/staffing/bands";
import type { BandDemand } from "@/lib/staffing/demand";
import { windowsOverlap, type TimeWindow } from "@/lib/turnaround";

// The roster side of the staffing demand (CLAUDE.md, 9. mérföldkő,
// "Számítás"): per band the agents who are in an operative segment of the
// actual roster and not in the block of a non-operative one. The roster is not
// split by task type or qualification: agents are not tied to a task type.

/** A segment of the roster with its agent. */
export interface StaffSegment extends BlockSource {
  userId: string;
  /** The layer it comes from (9. mérföldkő, utómunka); the actual one when not given. */
  layer?: "ACTUAL" | "DRAFT";
}

/** The windows minus the cuts, both as half-open intervals. */
export function subtractWindows(windows: readonly TimeWindow[], cuts: readonly TimeWindow[]): TimeWindow[] {
  const remaining: TimeWindow[] = [];
  const merged = mergeWindows(cuts);
  for (const window of mergeWindows(windows)) {
    let from = window.start.getTime();
    const to = window.end.getTime();
    for (const cut of merged) {
      const [cutFrom, cutTo] = [cut.start.getTime(), cut.end.getTime()];
      if (cutTo <= from || cutFrom >= to) continue;
      if (cutFrom > from) remaining.push({ start: new Date(from), end: new Date(cutFrom) });
      from = Math.max(from, cutTo);
    }
    if (from < to) remaining.push({ start: new Date(from), end: new Date(to) });
  }
  return remaining;
}

/**
 * When one agent can take a flight: their operative segments, without the
 * blocks of their non-operative ones (travel time included, which may reach
 * into the operative segment next to it).
 */
export function availableWindows(segments: readonly BlockSource[]): TimeWindow[] {
  return subtractWindows(
    segments.filter((segment) => segment.operative),
    segments.filter(castsBlock).map(blockWindow),
  );
}

/** The availability of every agent, one list of disjoint windows per agent. */
export function availabilityOf(segments: readonly StaffSegment[]): TimeWindow[][] {
  const byUser = new Map<string, StaffSegment[]>();
  for (const segment of segments) byUser.set(segment.userId, [...(byUser.get(segment.userId) ?? []), segment]);
  return [...byUser.values()].map(availableWindows);
}

/**
 * The roster of a band: the fewest agents available at once within it, so an
 * agent who is there for only a part of the band does not count.
 */
export function rosteredWithin(band: TimeWindow, availability: readonly (readonly TimeWindow[])[]): number {
  // An agent's windows do not overlap, so the windows running at an instant are as many agents.
  const touching = availability.flat().filter((window) => windowsOverlap(window, band));
  if (touching.length === 0) return 0;
  return Math.min(...changePoints(band, touching).map((instant) => countAt(touching, instant)));
}

export interface StaffingBand extends BandDemand {
  /** The agents available through the whole band. */
  rostered: number;
  /** Roster − total demand: negative is a shortage, positive a surplus. */
  balance: number;
}

/** Demand against the roster, band by band. */
export function staffingOfBands(demand: readonly BandDemand[], segments: readonly StaffSegment[]): StaffingBand[] {
  const availability = availabilityOf(segments);
  return demand.map((band) => {
    const rostered = rosteredWithin(band, availability);
    return { ...band, rostered, balance: rostered - band.total };
  });
}

export const shortageOf = (band: Pick<StaffingBand, "balance">) => Math.max(0, -band.balance);
export const surplusOf = (band: Pick<StaffingBand, "balance">) => Math.max(0, band.balance);
