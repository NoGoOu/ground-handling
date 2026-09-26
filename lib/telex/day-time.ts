// Times in messages are UTC, "ddhhmm" or "hhmm" (docs/messages.md). The day,
// when given, is the day of the month; the matching resolves it to a date.

export interface DayTime {
  /** Day of the month; null when only "hhmm" was given. */
  day: number | null;
  hour: number;
  minute: number;
}

/** "170716" → day 17, 07:16; "1745" → 17:45; null when neither. */
export function parseDayTime(text: string): DayTime | null {
  const match = text.match(/^(\d{2})?(\d{2})(\d{2})$/);
  if (!match) return null;
  const day = match[1] === undefined ? null : Number(match[1]);
  const hour = Number(match[2]);
  const minute = Number(match[3]);
  if (hour > 23 || minute > 59 || (day !== null && (day < 1 || day > 31))) return null;
  return { day, hour, minute };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Back to "ddhhmm", or "hhmm" without a day. */
export function formatDayTime(time: DayTime): string {
  return `${time.day === null ? "" : pad(time.day)}${pad(time.hour)}${pad(time.minute)}`;
}

/** "0040" → 40 minutes; null when not "hhmm". */
export function parseDuration(text: string): number | null {
  const match = text.match(/^(\d{2})(\d{2})$/);
  if (!match || Number(match[2]) > 59) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** 76 → "0116". */
export function formatDuration(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The dates with this day of the month in the month of the reference and the two around it. */
function datesWithDay(day: number, reference: Date): number[] {
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth();
  return [-1, 0, 1].flatMap((offset) => {
    const date = new Date(Date.UTC(year, month + offset, day));
    // Day 31 does not exist in every month.
    return date.getUTCDate() === day ? [date.getTime()] : [];
  });
}

/**
 * A header's day of the month as a date "YYYY-MM-DD": the date with that day
 * nearest to when the message came in (docs/messages.md, "Üzemnap").
 */
export function resolveOperatingDay(day: number, receivedAt: Date): string {
  const receivedDay = Date.UTC(receivedAt.getUTCFullYear(), receivedAt.getUTCMonth(), receivedAt.getUTCDate());
  const nearest = datesWithDay(day, receivedAt).reduce((best, date) =>
    Math.abs(date - receivedDay) < Math.abs(best - receivedDay) ? date : best,
  );
  return new Date(nearest).toISOString().slice(0, 10);
}

/**
 * A time of a message as an instant (UTC). With a day, the date with that day
 * nearest to the reference, e.g. the off-block on the 17th of a flight of the
 * 12th. Without one, the first such time at or after the reference, e.g. an
 * estimated arrival after the take-off.
 */
export function resolveDayTime(time: DayTime, reference: Date): Date {
  const minutes = (time.hour * 60 + time.minute) * 60_000;
  if (time.day !== null) {
    const referenceDay = Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate());
    const day = datesWithDay(time.day, reference).reduce((best, date) =>
      Math.abs(date - referenceDay) < Math.abs(best - referenceDay) ? date : best,
    );
    return new Date(day + minutes);
  }
  const sameDay = Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()) + minutes;
  return new Date(sameDay >= reference.getTime() ? sameDay : sameDay + DAY_MS);
}
