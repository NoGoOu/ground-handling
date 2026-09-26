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
