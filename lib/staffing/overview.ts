import type { StaffingDay } from "@/lib/staffing/day";
import { isShort } from "@/lib/staffing/summary";
import { addDays, localParts, parseLocalDate } from "@/lib/time";

// The overview of several days (CLAUDE.md, 9. mérföldkő, "Nézet"): a day ×
// band table of the total demand, at most 31 days long.

export const MAX_OVERVIEW_DAYS = 31;
/** The length of the period the overview opens with, from today. */
export const DEFAULT_OVERVIEW_DAYS = 7;

export type PeriodProblem = "order" | "tooLong";

export interface OverviewPeriod {
  from: string;
  to: string;
  days: number;
  /** Set when the period cannot be shown; the form keeps what was asked for. */
  problem: PeriodProblem | null;
}

function daysBetween(from: string, to: string): number {
  const [a, b] = [parseLocalDate(from)!, parseLocalDate(to)!];
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86_400_000) + 1;
}

/**
 * The period of the overview from the ?from and ?to parameters. Without them
 * (or with a broken date) it is a week from today; a period that ends before
 * it starts or is longer than 31 days is refused, not cut.
 */
export function overviewPeriod(fromValue: string | undefined, toValue: string | undefined, today: string): OverviewPeriod {
  const from = fromValue && parseLocalDate(fromValue) ? fromValue : today;
  const to = toValue && parseLocalDate(toValue) ? toValue : addDays(from, DEFAULT_OVERVIEW_DAYS - 1);
  const days = daysBetween(from, to);
  return { from, to, days, problem: days < 1 ? "order" : days > MAX_OVERVIEW_DAYS ? "tooLong" : null };
}

/** The same length of period before or after, for stepping through the calendar. */
export function shiftPeriod(period: Pick<OverviewPeriod, "from" | "to" | "days">, direction: 1 | -1): { from: string; to: string } {
  const shift = direction * period.days;
  return { from: addDays(period.from, shift), to: addDays(period.to, shift) };
}

/** The columns of the overview: the quarter hours of the local clock, 00:00 to 23:45. */
export const CLOCK_COLUMNS = 96;

export interface OverviewCell {
  start: Date;
  total: number;
  rostered: number;
  balance: number;
  short: boolean;
  /**
   * On the day the clocks go back the hour from 02:00 to 03:00 comes twice:
   * the cell stands for two bands, and shows the higher demand and the larger
   * shortage of the two. The daily view has both bands.
   */
  doubled: boolean;
}

/**
 * The bands of a day by the local clock, one per column. On the day the
 * clocks go forward the hour that does not exist has no cell (null).
 */
export function clockColumns(day: StaffingDay): (OverviewCell | null)[] {
  const columns: (OverviewCell | null)[] = Array.from({ length: CLOCK_COLUMNS }, () => null);
  for (const band of day.bands) {
    const { hour, minute } = localParts(band.start);
    const column = hour * 4 + Math.floor(minute / 15);
    const cell: OverviewCell = {
      start: band.start,
      total: band.total,
      rostered: band.rostered,
      balance: band.balance,
      short: isShort(day, band),
      doubled: false,
    };
    const earlier = columns[column];
    if (!earlier) {
      columns[column] = cell;
      continue;
    }
    // The worse of the two for the roster, the higher of the two for the demand.
    const worse = cell.balance < earlier.balance ? cell : earlier;
    columns[column] = {
      start: earlier.start,
      total: Math.max(earlier.total, cell.total),
      rostered: worse.rostered,
      balance: worse.balance,
      short: earlier.short || cell.short,
      doubled: true,
    };
  }
  return columns;
}

/** The highest demand of the period, for the colour scale; at least one. */
export function peakOfDays(days: readonly StaffingDay[]): number {
  return Math.max(1, ...days.flatMap((day) => day.bands.map((band) => band.total)));
}
