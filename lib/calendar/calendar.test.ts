import { describe, expect, it } from "vitest";
import { buildCalendar, escapeText, foldLine, formatDuration, formatUtc, PRODUCT_ID } from "@/lib/calendar/ics";
import { feedUrl, keyFromFileName, publicBaseUrl } from "@/lib/calendar/public-url";
import { calendarName, downloadRange, feedRange, rosterEvents, shiftUid, type CalendarSegment, type CalendarShift } from "@/lib/calendar/roster";
import { ownRosterDays } from "@/lib/roster";
import { localDayRange } from "@/lib/time";

// The roster calendar (CLAUDE.md, 12. mérföldkő, "Naptár").

const octets = (text: string) => new TextEncoder().encode(text).length;

describe("iCalendar text", () => {
  it("writes instants in UTC to the second", () => {
    expect(formatUtc(new Date("2026-10-05T04:00:00.000Z"))).toBe("20261005T040000Z");
    expect(formatUtc(new Date("2026-10-25T00:59:30.250Z"))).toBe("20261025T005930Z");
  });

  it("writes the refresh as a duration", () => {
    expect(formatDuration(60)).toBe("PT1H");
    expect(formatDuration(90)).toBe("PT90M");
    expect(formatDuration(15)).toBe("PT15M");
    expect(formatDuration(1440)).toBe("P1D");
  });

  it("escapes backslash, semicolon, comma and line breaks", () => {
    expect(escapeText("a\\b; c, d\ne\r\nf")).toBe("a\\\\b\\; c\\, d\\ne\\nf");
    expect(escapeText("Műszak 06:00–14:00")).toBe("Műszak 06:00–14:00");
  });

  it("folds at 75 octets, continuing with one space", () => {
    const line = `DESCRIPTION:${"x".repeat(200)}`;
    const folded = foldLine(line).split("\r\n");
    expect(folded.length).toBeGreaterThan(2);
    expect(octets(folded[0])).toBe(75);
    for (const part of folded.slice(1)) {
      expect(part.startsWith(" ")).toBe(true);
      expect(octets(part)).toBeLessThanOrEqual(75);
    }
    expect(folded.map((part, i) => (i === 0 ? part : part.slice(1))).join("")).toBe(line);
    expect(foldLine("SUMMARY:short")).toBe("SUMMARY:short");
  });

  it("never splits a multi-byte character", () => {
    const line = `DESCRIPTION:${"ő".repeat(60)}`;
    const folded = foldLine(line).split("\r\n");
    for (const part of folded) {
      expect(octets(part)).toBeLessThanOrEqual(75);
      expect(part).not.toContain("�");
    }
    expect(folded.map((part, i) => (i === 0 ? part : part.slice(1))).join("")).toBe(line);
  });

  it("makes a calendar with a header Outlook, Google and Apple read", () => {
    const text = buildCalendar({
      name: "Beosztás – Nagy Eszter",
      refreshMinutes: 60,
      now: new Date("2026-10-02T06:00:00Z"),
      events: [
        {
          uid: "shift-1@ground-handling",
          start: new Date("2026-10-05T04:00:00Z"),
          end: new Date("2026-10-05T12:00:00Z"),
          summary: "Műszak 06:00–14:00",
          description: "Részek:\nMűszak 06:00–14:00",
          lastModified: new Date("2026-10-01T10:00:00Z"),
        },
      ],
    });
    expect(text.endsWith("\r\n")).toBe(true);
    expect(text.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    const lines = text.split("\r\n");
    expect(lines.slice(0, 10)).toEqual([
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      `PRODID:${PRODUCT_ID}`,
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Beosztás – Nagy Eszter",
      "NAME:Beosztás – Nagy Eszter",
      "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
      "X-PUBLISHED-TTL:PT1H",
      "BEGIN:VEVENT",
    ]);
    expect(lines).toContain("UID:shift-1@ground-handling");
    expect(lines).toContain("DTSTAMP:20261002T060000Z");
    expect(lines).toContain("DTSTART:20261005T040000Z");
    expect(lines).toContain("DTEND:20261005T120000Z");
    expect(lines).toContain("LAST-MODIFIED:20261001T100000Z");
    expect(lines).toContain("DESCRIPTION:Részek:\\nMűszak 06:00–14:00");
    expect(lines.at(-2)).toBe("END:VCALENDAR");
    // No time zone of our own: every time is UTC, the calendar shows it in its own zone.
    expect(text).not.toContain("VTIMEZONE");
  });

  it("names the calendar after the agent", () => {
    expect(calendarName("Kiss Péter")).toBe("Beosztás – Kiss Péter");
  });
});

const segment = (type: string, start: string, end: string, extra: Partial<CalendarSegment> = {}): CalendarSegment => ({
  start: new Date(start),
  end: new Date(end),
  type: { id: type, name: type === "trn" ? "Oktatás" : "Műszak", operative: type !== "trn" },
  location: null,
  description: null,
  createBlock: false,
  travelBeforeMinutes: 0,
  travelAfterMinutes: 0,
  ...extra,
});

const shift = (id: string, segments: CalendarSegment[], updatedAt = "2026-10-01T10:00:00Z"): CalendarShift => ({
  id,
  start: segments[0]?.start ?? null,
  end: segments.reduce<Date | null>((latest, s) => (!latest || s.end > latest ? s.end : latest), null),
  updatedAt: new Date(updatedAt),
  segments,
});

const period = (start: string, end: string) => ({ startDate: localDayRange(start).start, endDate: localDayRange(end).start });

describe("roster events", () => {
  const publications = [period("2026-10-05", "2026-10-31")];

  it("makes one event per actual shift of a published day, with a stable id", () => {
    const actual = [shift("a1", [segment("op", "2026-10-05T04:00Z", "2026-10-05T12:00Z", { location: "T2 terminál" })])];
    const days = ownRosterDays(["2026-10-04", "2026-10-05"], publications, actual, actual);
    const events = rosterEvents(days);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      uid: shiftUid("a1"),
      summary: "Műszak 06:00–14:00",
      description: "Részek:\nMűszak 06:00–14:00 · T2 terminál",
      start: new Date("2026-10-05T04:00Z"),
      end: new Date("2026-10-05T12:00Z"),
      lastModified: new Date("2026-10-01T10:00:00Z"),
    });
    // The same shift gives the same id after a change: the calendar updates it.
    const moved = [shift("a1", [segment("op", "2026-10-05T06:00Z", "2026-10-05T14:00Z")], "2026-10-04T05:00:00Z")];
    expect(rosterEvents(ownRosterDays(["2026-10-05"], publications, actual, moved))[0].uid).toBe(shiftUid("a1"));
  });

  it("leaves out the days not published yet", () => {
    const actual = [shift("a1", [segment("op", "2026-11-02T05:00Z", "2026-11-02T13:00Z")])];
    expect(rosterEvents(ownRosterDays(["2026-11-02"], publications, actual, actual))).toEqual([]);
  });

  it("keeps the times right over the clock change and over midnight", () => {
    // 25 October 2026: clocks go back at 03:00; the shift runs 00:00–08:00 local, nine hours.
    const night = [shift("n1", [segment("op", "2026-10-24T22:00Z", "2026-10-25T07:00Z")])];
    const [dst] = rosterEvents(ownRosterDays(["2026-10-25"], publications, night, night));
    expect(dst.summary).toBe("Műszak 00:00–08:00");
    expect(dst.end.getTime() - dst.start.getTime()).toBe(9 * 3600_000);
    // Over midnight: the event belongs to the day it starts on and ends the next day.
    const late = [shift("l1", [segment("op", "2026-10-07T20:00Z", "2026-10-08T04:00Z")])];
    const [overnight] = rosterEvents(ownRosterDays(["2026-10-07", "2026-10-08"], publications, late, late));
    expect(overnight.summary).toBe("Műszak 22:00–06:00");
    expect(overnight.description).toContain("Műszak 22:00–06:00 (+1)");
  });

  it("writes the block with travel, and the change with the published shift when they differ", () => {
    const published = [shift("p1", [segment("op", "2026-10-06T04:00Z", "2026-10-06T12:00Z")])];
    const actual = [
      shift(
        "a1",
        [
          segment("trn", "2026-10-06T06:00Z", "2026-10-06T07:30Z", {
            createBlock: true,
            travelBeforeMinutes: 20,
            travelAfterMinutes: 20,
            location: "Oktatóterem",
            description: "Veszélyes áru",
          }),
          segment("op", "2026-10-06T08:00Z", "2026-10-06T14:00Z"),
        ],
        "2026-10-04T05:30:00Z",
      ),
    ];
    const [event] = rosterEvents(ownRosterDays(["2026-10-06"], publications, published, actual));
    expect(event.summary).toBe("Műszak 08:00–16:00");
    expect(event.description.split("\n")).toEqual([
      "Részek:",
      "Oktatás 08:00–09:30 · Oktatóterem · Veszélyes áru · blokk az utazással: 07:40–09:50",
      "Műszak 10:00–16:00",
      "",
      "Módosult: 10. 04. 07:30. Publikált: 06:00–14:00 (Műszak 06:00–14:00)",
    ]);
  });

  it("tells a shift added on a free published day", () => {
    const actual = [shift("a1", [segment("op", "2026-10-06T04:00Z", "2026-10-06T12:00Z")], "2026-10-03T08:00:00Z")];
    const [event] = rosterEvents(ownRosterDays(["2026-10-06"], publications, [], actual));
    expect(event.description).toContain("Módosult: 10. 03. 10:00. Publikált: szabad");
  });

  it("has no event for an actual shift removed: the calendar drops it", () => {
    const published = [shift("p1", [segment("op", "2026-10-06T04:00Z", "2026-10-06T12:00Z")])];
    expect(rosterEvents(ownRosterDays(["2026-10-06"], publications, published, []))).toEqual([]);
  });
});

describe("the periods of the calendar", () => {
  it("downloads the week of today by default, or a period of at most 31 days", () => {
    expect(downloadRange(null, null, "2026-10-02")).toEqual({ start: "2026-09-28", days: 7 });
    expect(downloadRange("2026-10-01", "2026-10-31", "2026-10-02")).toEqual({ start: "2026-10-01", days: 31 });
    expect(downloadRange("2026-10-01", "2026-11-01", "2026-10-02")).toBeNull();
    expect(downloadRange("2026-10-05", "2026-10-04", "2026-10-02")).toBeNull();
    expect(downloadRange("2026-13-01", null, "2026-10-02")).toBeNull();
    expect(downloadRange("2026-10-05", null, "2026-10-02")).toEqual({ start: "2026-10-05", days: 7 });
  });

  it("subscribes from a week back to the last published day", () => {
    expect(feedRange("2026-10-02", "2026-10-31")).toEqual({ start: "2026-09-25", days: 37 });
    // Nothing published ahead: still the past week and today.
    expect(feedRange("2026-10-02", null)).toEqual({ start: "2026-09-25", days: 8 });
    expect(feedRange("2026-10-02", "2026-09-30")).toEqual({ start: "2026-09-25", days: 8 });
  });
});

describe("the subscription link", () => {
  it("takes an https public address, or http on this machine only", () => {
    expect(publicBaseUrl("https://gh.example.com")).toBe("https://gh.example.com");
    expect(publicBaseUrl("https://example.com/ground-handling/")).toBe("https://example.com/ground-handling");
    expect(publicBaseUrl("http://localhost:3000")).toBe("http://localhost:3000");
    expect(publicBaseUrl("http://gh.example.com")).toBeNull();
    expect(publicBaseUrl("https://gh.example.com/?x=1")).toBeNull();
    expect(publicBaseUrl("not a url")).toBeNull();
    expect(publicBaseUrl("")).toBeNull();
    expect(publicBaseUrl(undefined)).toBeNull();
  });

  it("ends in .ics, and the key comes back from it", () => {
    const key = "AbC_dEf-123456789012345678901234";
    expect(feedUrl("https://gh.example.com", key)).toBe(`https://gh.example.com/api/calendar/${key}.ics`);
    expect(keyFromFileName(`${key}.ics`)).toBe(key);
    expect(keyFromFileName(key)).toBeNull();
    expect(keyFromFileName("short.ics")).toBeNull();
    expect(keyFromFileName("../../etc/passwd.ics")).toBeNull();
  });
});
