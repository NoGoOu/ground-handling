import type { StaffingDay } from "@/lib/staffing/day";
import { shortageOf, type StaffingBand } from "@/lib/staffing/roster";

// The day in a few numbers (CLAUDE.md, 9. mérföldkő, "Nézet"): the peak of
// the day and its time, and the largest shortage.

/**
 * Whether the band is marked as short. A day without any actual roster (e.g.
 * not yet published) shows its demand, but nothing on it is marked as a shortage.
 */
export function isShort(day: Pick<StaffingDay, "hasRoster">, band: Pick<StaffingBand, "balance">): boolean {
  return day.hasRoster && band.balance < 0;
}

export interface DaySummary {
  /** The highest total demand of the day; zero on a day without work. */
  peak: number;
  /** The start of the first band with the peak. */
  peakAt: Date | null;
  /** The largest shortage; zero when no band is short. */
  shortage: number;
  /** The start of the first band with the largest shortage. */
  shortageAt: Date | null;
  /** How many bands are short. */
  shortBands: number;
}

export function summaryOf(day: StaffingDay): DaySummary {
  const peak = Math.max(0, ...day.bands.map((band) => band.total));
  const short = day.bands.filter((band) => isShort(day, band));
  const shortage = Math.max(0, ...short.map(shortageOf));
  return {
    peak,
    peakAt: peak > 0 ? day.bands.find((band) => band.total === peak)!.start : null,
    shortage,
    shortageAt: shortage > 0 ? short.find((band) => shortageOf(band) === shortage)!.start : null,
    shortBands: short.length,
  };
}
