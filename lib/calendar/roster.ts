import { blockWindow, castsBlock } from "@/lib/board";
import type { CalendarEvent } from "@/lib/calendar/ics";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { daysBetween } from "@/lib/qualifications";
import { formatChangeTime, shiftsSpan, timeSpan, type DayShift, type OwnRosterDay } from "@/lib/roster";
import { addDays, formatTime, formatTimeOnDay, parseLocalDate, startOfWeek } from "@/lib/time";

// The agent's roster as calendar events (CLAUDE.md, 12. mérföldkő, "Naptár"):
// the actual shifts of the published days, one event per shift. The download
// and the subscription hold the same.

const c = messages.calendar;

export interface CalendarSegment {
  start: Date;
  end: Date;
  type: { id: string; name: string; operative: boolean };
  location: string | null;
  description: string | null;
  createBlock: boolean;
  travelBeforeMinutes: number;
  travelAfterMinutes: number;
}

export interface CalendarShift extends DayShift {
  id: string;
  end: Date | null;
  segments: readonly CalendarSegment[];
}

/** Tied to the shift, so a change updates the event and a removed shift disappears. */
export function shiftUid(shiftId: string): string {
  return `shift-${shiftId}@ground-handling`;
}

/** "Oktatás 09:00–10:30 · Oktatóterem · Veszélyes áru ismétlő · blokk az utazással: 08:40–10:50" */
function segmentLine(segment: CalendarSegment, day: string): string {
  const parts = [`${segment.type.name} ${timeSpan(segment.start, segment.end, day)}`];
  if (segment.location) parts.push(segment.location);
  if (segment.description) parts.push(segment.description);
  if (castsBlock({ operative: segment.type.operative, createBlock: segment.createBlock })) {
    const block = blockWindow(segment);
    parts.push(fmt(c.block, { from: formatTimeOnDay(block.start, day), to: formatTimeOnDay(block.end, day) }));
  }
  return parts.join(" · ");
}

function description(shift: CalendarShift, day: OwnRosterDay<CalendarShift>): string {
  const lines = [c.segments, ...shift.segments.map((segment) => segmentLine(segment, day.day))];
  if (day.differs) {
    const published = shiftsSpan(day.publishedShifts, day.day);
    const parts = day.publishedShifts.flatMap((s) => s.segments.map((segment) => segmentLine(segment, day.day)));
    lines.push(
      "",
      fmt(c.changed, {
        time: formatChangeTime(day.changedAt ?? shift.updatedAt),
        published: published ? `${published} (${parts.join("; ")})` : c.free,
      }),
    );
  }
  return lines.join("\n");
}

/** One event for each actual shift of a published day; nothing for the other days. */
export function rosterEvents(days: readonly OwnRosterDay<CalendarShift>[]): CalendarEvent[] {
  return days
    .filter((day) => day.published)
    .flatMap((day) =>
      day.actualShifts
        .filter((shift) => shift.start && shift.end)
        .map((shift) => ({
          uid: shiftUid(shift.id),
          start: shift.start!,
          end: shift.end!,
          summary: fmt(c.summary, { time: `${formatTime(shift.start!)}–${formatTime(shift.end!)}` }),
          description: description(shift, day),
          lastModified: shift.updatedAt,
        })),
    );
}

export function calendarName(userName: string): string {
  return fmt(c.name, { name: userName });
}

export const MAX_DOWNLOAD_DAYS = 31;

/**
 * The days of a download: the given period, by default the week of today.
 * Null for a wrong date, an end before the start, or more than 31 days.
 */
export function downloadRange(from: string | null, to: string | null, today: string): { start: string; days: number } | null {
  const start = from || startOfWeek(today);
  if (!parseLocalDate(start)) return null;
  const end = to || addDays(start, 6);
  if (!parseLocalDate(end)) return null;
  const days = daysBetween(start, end) + 1;
  return days >= 1 && days <= MAX_DOWNLOAD_DAYS ? { start, days } : null;
}

/** Days kept in the past by the subscription (placeholder). */
export const FEED_DAYS_BACK = 7;

/**
 * The days of the subscription: from a week back to the last published day
 * (CLAUDE.md, "Tartalom"), at least up to today.
 */
export function feedRange(today: string, lastPublishedDay: string | null): { start: string; days: number } {
  const start = addDays(today, -FEED_DAYS_BACK);
  const end = lastPublishedDay && lastPublishedDay > today ? lastPublishedDay : today;
  return { start, days: daysBetween(start, end) + 1 };
}
