// Conversion between UTC instants (storage) and Europe/Budapest wall-clock time (UI).

export const TIME_ZONE = "Europe/Budapest";

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export function localParts(instant: Date): LocalParts {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(instant).map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Minutes the zone is ahead of UTC at the given instant (60 in winter, 120 in summer). */
function offsetMinutes(instant: Date): number {
  const p = localParts(instant);
  const wallClockAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const instantToMinute = Math.floor(instant.getTime() / 60_000) * 60_000;
  return Math.round((wallClockAsUtc - instantToMinute) / 60_000);
}

/** The UTC instant of a Budapest wall-clock time. */
export function localToUtc(year: number, month: number, day: number, hour: number, minute: number): Date {
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  const first = wallClockAsUtc - offsetMinutes(new Date(wallClockAsUtc)) * 60_000;
  const second = wallClockAsUtc - offsetMinutes(new Date(first)) * 60_000;
  return new Date(second);
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function isValidDate(year: number, month: number, day: number): boolean {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/** Parses "YYYY-MM-DD" (a local calendar day). */
export function parseLocalDate(value: string): { year: number; month: number; day: number } | null {
  const m = DATE_RE.exec(value);
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return isValidDate(year, month, day) ? { year, month, day } : null;
}

/** Parses a datetime-local input value ("YYYY-MM-DDTHH:MM", Budapest time) into UTC. */
export function parseLocalDateTime(value: string): Date | null {
  const m = DATE_TIME_RE.exec(value);
  if (!m) return null;
  const [year, month, day, hour, minute] = m.slice(1).map(Number);
  if (!isValidDate(year, month, day) || hour > 23 || minute > 59) return null;
  return localToUtc(year, month, day, hour, minute);
}

/** "YYYY-MM-DD" of the Budapest calendar day containing the instant. */
export function toLocalDate(instant: Date): string {
  const p = localParts(instant);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** datetime-local input value ("YYYY-MM-DDTHH:MM") in Budapest time. */
export function toLocalDateTimeInput(instant: Date): string {
  const p = localParts(instant);
  return `${toLocalDate(instant)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** "HH:MM" in Budapest time. */
export function formatTime(instant: Date): string {
  const p = localParts(instant);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** "HH:MM", or "MM.DD. HH:MM" when the instant is not on the reference local day. */
export function formatTimeOnDay(instant: Date, referenceLocalDate: string): string {
  if (toLocalDate(instant) === referenceLocalDate) return formatTime(instant);
  const p = localParts(instant);
  return `${pad(p.month)}.${pad(p.day)}. ${formatTime(instant)}`;
}

/** "YYYY. MM. DD. HH:MM" in Budapest time. */
export function formatDateTime(instant: Date): string {
  const p = localParts(instant);
  return `${p.year}. ${pad(p.month)}. ${pad(p.day)}. ${formatTime(instant)}`;
}

/** Adds calendar days to a "YYYY-MM-DD" string. */
export function addDays(localDate: string, days: number): string {
  const d = parseLocalDate(localDate);
  if (!d) throw new Error(`Invalid date: ${localDate}`);
  const shifted = new Date(Date.UTC(d.year, d.month - 1, d.day + days));
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** UTC bounds [start, end) of a Budapest calendar day (23 or 25 hours on DST change days). */
export function localDayRange(localDate: string): { start: Date; end: Date } {
  const d = parseLocalDate(localDate);
  const next = parseLocalDate(addDays(localDate, 1));
  if (!d || !next) throw new Error(`Invalid date: ${localDate}`);
  return {
    start: localToUtc(d.year, d.month, d.day, 0, 0),
    end: localToUtc(next.year, next.month, next.day, 0, 0),
  };
}

/** Day of the week of a Budapest date: 0 = Monday … 6 = Sunday. */
export function weekdayIndex(localDate: string): number {
  const d = parseLocalDate(localDate);
  if (!d) throw new Error(`Invalid date: ${localDate}`);
  return (new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay() + 6) % 7;
}

/** The Monday of the week containing the given day. */
export function startOfWeek(localDate: string): string {
  return addDays(localDate, -weekdayIndex(localDate));
}

/** "MM. DD." for the roster table header. */
export function formatDayShort(localDate: string): string {
  const d = parseLocalDate(localDate);
  if (!d) throw new Error(`Invalid date: ${localDate}`);
  return `${pad(d.month)}. ${pad(d.day)}.`;
}
