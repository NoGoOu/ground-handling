// A minimal iCalendar writer (RFC 5545) for the roster calendar (CLAUDE.md,
// 12. mérföldkő, "Naptár"). Pure functions: the text is the same for the same
// input, so it can be tested on its own. Written for wide compatibility,
// Outlook included: times in UTC, CRLF line ends, lines folded at 75 octets.

export interface CalendarEvent {
  /** Stable across changes, so a calendar updates the event instead of adding another. */
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description: string;
  lastModified: Date;
}

export interface Calendar {
  name: string;
  /** The suggested refresh of a subscribed calendar; the calendar may ignore it. */
  refreshMinutes: number;
  events: readonly CalendarEvent[];
  /** When the text is made (DTSTAMP). */
  now: Date;
}

export const PRODUCT_ID = "-//Ground Handling App//Beosztas//HU";
const MAX_OCTETS = 75;

/** "20261005T040000Z": an instant in UTC, to the second. */
export function formatUtc(instant: Date): string {
  return instant.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** A duration in minutes as iCalendar writes it: "PT1H", "PT90M", "P1D". */
export function formatDuration(minutes: number): string {
  if (minutes > 0 && minutes % 1440 === 0) return `P${minutes / 1440}D`;
  if (minutes > 0 && minutes % 60 === 0) return `PT${minutes / 60}H`;
  return `PT${minutes}M`;
}

/** Text values escape backslash, semicolon, comma and line breaks. */
export function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Folds a content line at 75 octets: each continuation starts with one space,
 * and a multi-byte character is never split.
 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let octets = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    // Continuation lines spend one octet on their leading space.
    const limit = parts.length === 0 ? MAX_OCTETS : MAX_OCTETS - 1;
    if (octets + size > limit) {
      parts.push(current);
      current = "";
      octets = 0;
    }
    current += char;
    octets += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function eventLines(event: CalendarEvent, now: Date): string[] {
  return [
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${formatUtc(now)}`,
    `DTSTART:${formatUtc(event.start)}`,
    `DTEND:${formatUtc(event.end)}`,
    `LAST-MODIFIED:${formatUtc(event.lastModified)}`,
    `SUMMARY:${escapeText(event.summary)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
  ];
}

/** The whole calendar as text, CRLF line ends, ready to serve as text/calendar. */
export function buildCalendar({ name, refreshMinutes, events, now }: Calendar): string {
  const refresh = formatDuration(refreshMinutes);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODUCT_ID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    // The name: X-WR-CALNAME for Outlook, Google and Apple, NAME by RFC 7986.
    `X-WR-CALNAME:${escapeText(name)}`,
    `NAME:${escapeText(name)}`,
    // The suggested refresh: REFRESH-INTERVAL by RFC 7986, X-PUBLISHED-TTL for Outlook.
    `REFRESH-INTERVAL;VALUE=DURATION:${refresh}`,
    `X-PUBLISHED-TTL:${refresh}`,
    ...events.flatMap((event) => eventLines(event, now)),
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
