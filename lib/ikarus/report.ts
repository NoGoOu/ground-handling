import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { formatTime, localDayRange, weekdayIndex } from "@/lib/time";
import type { TimeWindow } from "@/lib/turnaround";
import { parseScheduled, type Snapshot } from "./snapshot";

// The evaluation of the real days (CLAUDE.md, "Közbeiktatva: valós járatok
// az Ikarus-mentésből", "Kiértékelés"): per day the flights and turnarounds,
// what the planner makes of them and the peak of the staffing demand; for the
// whole period the weekday and the weekend average. The report goes to the
// owner's machine, outside the repository. Pure.

const t = messages.ikarus.report;

/** The scheduled times each snapshot covers, merged: per direction, where the backup saw every flight. */
export interface Coverage {
  arrivals: TimeWindow[];
  departures: TimeWindow[];
}

function merge(windows: TimeWindow[]): TimeWindow[] {
  const sorted = [...windows].sort((a, b) => +a.start - +b.start);
  const merged: TimeWindow[] = [];
  for (const window of sorted) {
    const last = merged.at(-1);
    if (last && +window.start <= +last.end) last.end = new Date(Math.max(+last.end, +window.end));
    else merged.push({ start: window.start, end: window.end });
  }
  return merged;
}

function spanOf(records: readonly unknown[]): TimeWindow | null {
  const times = records.flatMap((record) => {
    const time = parseScheduled((record as { scheduledTime?: unknown } | null)?.scheduledTime);
    return time ? [+time] : [];
  });
  return times.length ? { start: new Date(Math.min(...times)), end: new Date(Math.max(...times)) } : null;
}

/**
 * A snapshot lists the flights from some hours before it to some hours after
 * it; between its first and last scheduled time it saw them all. Where the
 * spans of the snapshots join up, nothing is missing; a gap in the backup
 * longer than the window leaves a hole.
 */
export function coverageOf(snapshots: readonly Snapshot[]): Coverage {
  const spans = (pick: (s: Snapshot) => readonly unknown[]) => merge(snapshots.flatMap((s) => spanOf(pick(s)) ?? []));
  return { arrivals: spans((s) => s.arrivals), departures: spans((s) => s.departures) };
}

const covers = (windows: readonly TimeWindow[], range: TimeWindow) =>
  windows.some((window) => +window.start <= +range.start && +window.end >= +range.end);

/**
 * A Budapest day whose every arrival and departure the backup saw, and that
 * was over before the last snapshot (else its actual times are missing).
 */
export function isCompleteDay(day: string, coverage: Coverage, lastSnapshot: Date): boolean {
  const range = localDayRange(day);
  return +lastSnapshot >= +range.end && covers(coverage.arrivals, range) && covers(coverage.departures, range);
}

export interface ReportDay {
  day: string;
  complete: boolean;
  /** Ikarus flights on the day's flight list (rule 1). */
  flights: number;
  quick: number;
  long: number;
  arrivalOnly: number;
  departureOnly: number;
  /** The planner with the current settings, without the qualification check. */
  positions: number;
  workMinutes: number;
  /** The highest total demand of a 15-minute band, and when it starts. */
  peak: number;
  peakAt: Date | null;
}

export interface Average {
  days: number;
  flights: number;
  positions: number;
  workHours: number;
  peak: number;
}

const isWeekend = (day: string) => weekdayIndex(day) >= 5;

/** The averages of the complete days, weekdays and weekend apart. */
export function averages(rows: readonly ReportDay[]): { weekday: Average; weekend: Average } {
  const of = (list: readonly ReportDay[]): Average => {
    const mean = (pick: (row: ReportDay) => number) => (list.length ? list.reduce((sum, row) => sum + pick(row), 0) / list.length : 0);
    return {
      days: list.length,
      flights: mean((r) => r.flights),
      positions: mean((r) => r.positions),
      workHours: mean((r) => r.workMinutes / 60),
      peak: mean((r) => r.peak),
    };
  };
  const complete = rows.filter((row) => row.complete);
  return { weekday: of(complete.filter((row) => !isWeekend(row.day))), weekend: of(complete.filter((row) => isWeekend(row.day))) };
}

/** A number with a decimal comma, as Hungarian spreadsheets read it. */
const decimal = (value: number, digits = 1) => value.toFixed(digits).replace(".", ",");

/** Semicolons between the cells and a decimal comma, for a spreadsheet set to Hungarian. */
export function reportCsv(rows: readonly ReportDay[]): string {
  const lines = [
    t.columns.join(";"),
    ...rows.map((row) =>
      [
        row.day,
        t.weekdays[weekdayIndex(row.day)],
        row.complete ? t.yes : t.no,
        row.flights,
        row.quick,
        row.long,
        row.arrivalOnly,
        row.departureOnly,
        row.positions,
        decimal(row.workMinutes / 60),
        row.peak,
        row.peakAt ? formatTime(row.peakAt) : "",
      ].join(";"),
    ),
  ];
  return `${lines.join("\r\n")}\r\n`;
}

export interface ReportSettings {
  /** The planning settings the plans were made with. */
  planning: { minShiftMinutes: number; maxShiftMinutes: number; breakMinutes: number; breakAfterMinutes: number; restMinutes: number; overlapMinutes: number };
  /** The template parameters in use, with how many tasks have them. */
  templates: { params: string; tasks: number }[];
}

/** The short summary next to the CSV. */
export function reportText(rows: readonly ReportDay[], period: { start: string; end: string }, settings: ReportSettings): string {
  const { weekday, weekend } = averages(rows);
  const line = (label: string, a: Average) =>
    a.days === 0
      ? fmt(t.noAverage, { label })
      : fmt(t.average, {
          label,
          days: a.days,
          flights: decimal(a.flights),
          positions: decimal(a.positions),
          workHours: decimal(a.workHours),
          peak: decimal(a.peak),
        });
  const incomplete = rows.filter((row) => !row.complete).map((row) => row.day);
  return [
    t.title,
    fmt(t.period, { start: period.start, end: period.end, days: rows.length, complete: rows.length - incomplete.length }),
    ...(incomplete.length ? [fmt(t.incomplete, { days: incomplete.join(", ") })] : []),
    "",
    line(t.weekday, weekday),
    line(t.weekend, weekend),
    t.reality,
    "",
    fmt(t.planning, settings.planning),
    t.templatesTitle,
    ...settings.templates.map((template) => fmt(t.template, template)),
    "",
    t.note,
  ].join("\r\n").concat("\r\n");
}
