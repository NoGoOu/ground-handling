import { formatDayShort, formatTime, localDayRange, toLocalDate } from "@/lib/time";

// Pure roster helpers (CLAUDE.md, "2. mérföldkő"). No database access, so they
// can be unit tested on their own.

export interface PublishedRange {
  /** Budapest midnight of the first and the last published day. */
  startDate: Date;
  endDate: Date;
}

/** Whether some publication covers that Budapest day; a day is published once. */
export function isPublished(day: string, publications: readonly PublishedRange[]): boolean {
  const midnight = localDayRange(day).start.getTime();
  return publications.some(
    (publication) => publication.startDate.getTime() <= midnight && publication.endDate.getTime() >= midnight,
  );
}

/** What a segment is compared by: its type and its times. */
export interface MatchSegment {
  typeId: string;
  start: Date;
  end: Date;
}

export interface ComparableSegment extends MatchSegment {
  id: string;
}

const segmentKey = (segment: MatchSegment) => `${segment.typeId} ${segment.start.getTime()} ${segment.end.getTime()}`;

/**
 * Whether the published and the actual layer of one roster cell match: the
 * same segments, by type and times (CLAUDE.md, "Beosztás felülete"). The roster
 * table, the agent's own roster and the calendar all compare this way.
 */
export function sameSegments(a: readonly MatchSegment[], b: readonly MatchSegment[]): boolean {
  const key = (segments: readonly MatchSegment[]) => segments.map(segmentKey).sort().join(" | ");
  return key(a) === key(b);
}

/**
 * Which segments the published and the actual layer do not share, so the cell
 * can highlight the differences (CLAUDE.md, "Beosztás felülete"). Segments match
 * by type and times; equal segments pair up one by one.
 */
export function segmentDifferences(
  published: readonly ComparableSegment[],
  actual: readonly ComparableSegment[],
): { publishedOnly: string[]; actualOnly: string[] } {
  const remaining = new Map<string, number>();
  for (const segment of published) {
    const key = segmentKey(segment);
    remaining.set(key, (remaining.get(key) ?? 0) + 1);
  }

  const actualOnly: string[] = [];
  const matched = new Map<string, number>();
  for (const segment of actual) {
    const key = segmentKey(segment);
    const left = remaining.get(key) ?? 0;
    if (left > 0) {
      remaining.set(key, left - 1);
      matched.set(key, (matched.get(key) ?? 0) + 1);
    } else {
      actualOnly.push(segment.id);
    }
  }

  const publishedOnly: string[] = [];
  const used = new Map(matched);
  for (const segment of published) {
    const key = segmentKey(segment);
    const pairs = used.get(key) ?? 0;
    if (pairs > 0) used.set(key, pairs - 1);
    else publishedOnly.push(segment.id);
  }

  return { publishedOnly, actualOnly };
}

/** A shift as the agent's own roster needs it. */
export interface DayShift {
  /** Earliest segment start; a shift belongs to the Budapest day it starts on. */
  start: Date | null;
  /** The latest change of the shift or any of its segments. */
  updatedAt: Date;
  segments: readonly { type: { id: string }; start: Date; end: Date }[];
}

export interface OwnRosterDay<S extends DayShift> {
  day: string;
  published: boolean;
  /** Both empty on a day not published yet: the agent does not see the draft. */
  publishedShifts: S[];
  actualShifts: S[];
  /** The actual layer differs from the published one. */
  differs: boolean;
  /**
   * When the actual layer last changed, shown with a difference. Null when the
   * actual shift was removed: nothing is left to tell the time by (approved
   * decision 1 of milestone 12).
   */
  changedAt: Date | null;
}

const matchSegments = (shifts: readonly DayShift[]): MatchSegment[] =>
  shifts.flatMap((shift) => shift.segments.map((s) => ({ typeId: s.type.id, start: s.start, end: s.end })));

/**
 * The agent's own roster day by day (CLAUDE.md, 12. mérföldkő): the published
 * and the actual shifts that start on each day, whether they differ, and when
 * the actual one changed.
 */
export function ownRosterDays<S extends DayShift>(
  days: readonly string[],
  publications: readonly PublishedRange[],
  published: readonly S[],
  actual: readonly S[],
): OwnRosterDay<S>[] {
  const onDay = (shifts: readonly S[], day: string) => shifts.filter((shift) => shift.start && toLocalDate(shift.start) === day);
  return days.map((day) => {
    if (!isPublished(day, publications)) {
      return { day, published: false, publishedShifts: [], actualShifts: [], differs: false, changedAt: null };
    }
    const publishedShifts = onDay(published, day);
    const actualShifts = onDay(actual, day);
    const differs = !sameSegments(matchSegments(publishedShifts), matchSegments(actualShifts));
    const changedAt = differs
      ? actualShifts.reduce<Date | null>((latest, shift) => (!latest || shift.updatedAt > latest ? shift.updatedAt : latest), null)
      : null;
    return { day, published: true, publishedShifts, actualShifts, differs, changedAt };
  });
}

/** "06:00–14:00" on the shift's own day; "22:00–06:00 (+1)" when it ends on a later day. */
export function timeSpan(start: Date, end: Date, day: string): string {
  const later = toLocalDate(end) > day && end.getTime() !== localDayRange(toLocalDate(end)).start.getTime();
  return `${formatTime(start)}–${formatTime(end)}${later ? " (+1)" : ""}`;
}

/** The time spans of a day's shifts, or null when there is none. */
export function shiftsSpan(shifts: readonly { start: Date | null; end: Date | null }[], day: string): string | null {
  const spans = shifts.filter((s) => s.start && s.end).map((s) => timeSpan(s.start!, s.end!, day));
  return spans.length ? spans.join(", ") : null;
}

/** "10. 02. 07:30": when the actual shift changed. */
export function formatChangeTime(instant: Date): string {
  return `${formatDayShort(toLocalDate(instant))} ${formatTime(instant)}`;
}
