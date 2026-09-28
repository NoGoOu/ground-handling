import { warn, type TelexWarning } from "./warnings";

// PSM and PTM carry names (docs/messages.md, "PSM", "PTM"). Only the counts
// derived from them are kept: names, seats and the connections of single
// passengers are skipped, never copied, and a warning never quotes a line.

/** "LH1338/27SEP FRA PART1" or "TK1034/26SEP BUDIST PART2". */
export interface PersonalHeader {
  flightNumber: string;
  /** "27SEP", as written. */
  dateText: string;
  day: number;
  month: number;
  /** PSM: the station the flight departs from; PTM: the route, from and to. */
  from: string;
  to: string | null;
  part: number;
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function parsePersonalHeader(line: string): PersonalHeader | null {
  const m = line
    .trim()
    .toUpperCase()
    .match(/^([A-Z0-9]+)\/(\d{1,2})([A-Z]{3})\s+([A-Z]{3})([A-Z]{3})?\s+PART(\d+)$/);
  const month = m ? MONTHS.indexOf(m[3]) + 1 : 0;
  if (!m || month === 0 || Number(m[2]) < 1 || Number(m[2]) > 31) return null;
  return {
    flightNumber: m[1],
    dateText: `${m[2]}${m[3]}`,
    day: Number(m[2]),
    month,
    from: m[4],
    to: m[5] ?? null,
    part: Number(m[6]),
  };
}

const isEnd = (line: string) => /^END(PSM|PTM|PART\d+)$/.test(line);

export interface PsmData {
  /** The station the flight departs from. */
  station: string;
  part: number;
  /** ENDPSM rather than ENDPARTn: the last part. */
  last: boolean;
  /** Per destination block: passengers, SSRs, and per code the count per class. */
  destinations: {
    destination: string;
    pax: number;
    ssr: number;
    codes: { code: string; byClass: { cls: string; count: number }[] }[];
  }[];
}

/**
 * The PSM body: "-BUD 1PAX / 1SSR", code lines "WCHR 001C 000M", then per
 * class the passengers, which are skipped.
 */
export function parsePsm(header: PersonalHeader, body: readonly string[]): { data: PsmData; warnings: TelexWarning[] } {
  const data: PsmData = { station: header.from, part: header.part, last: false, destinations: [] };
  let unread = 0;
  // After a class line come names and seats: nothing is read until the next block.
  let inPassengers = false;
  for (const raw of body) {
    const line = raw.trim().toUpperCase().replace(/\s+/g, " ");
    if (line === "") continue;
    if (isEnd(line)) {
      data.last = line === "ENDPSM";
      break;
    }
    const block = line.match(/^-([A-Z]{3}) (\d+)PAX ?\/ ?(\d+)SSR$/);
    if (block) {
      data.destinations.push({ destination: block[1], pax: +block[2], ssr: +block[3], codes: [] });
      inPassengers = false;
      continue;
    }
    if (/^[A-Z] CLASS\b/.test(line)) {
      inPassengers = true;
      continue;
    }
    if (inPassengers) continue;
    const code = line.match(/^([A-Z]{4})((?: \d{3}[A-Z])+)$/);
    const current = data.destinations.at(-1);
    if (code && current) {
      current.codes.push({
        code: code[1],
        byClass: [...code[2].matchAll(/(\d{3})([A-Z])/g)].map((c) => ({ cls: c[2], count: Number(c[1]) })),
      });
    } else unread++;
  }
  const warnings: TelexWarning[] = [];
  // Never the line itself: it may hold a name.
  if (unread > 0) warnings.push(warn("unreadLines", { count: unread }));
  for (const d of data.destinations) {
    const sum = d.codes.flatMap((c) => c.byClass).reduce((total, c) => total + c.count, 0);
    if (sum !== d.ssr) warnings.push(warn("psmSsrSum", { destination: d.destination, ssr: d.ssr, sum }));
  }
  return { data, warnings };
}

export interface PtmData {
  /** The route: from and to. */
  from: string;
  to: string | null;
  part: number;
  last: boolean;
  /** Per onward flight, destination and class: passengers, bags and their kg. */
  transfers: { flight: string; destination: string; cls: string; pax: number; bags: number; weight: number }[];
}

/** "TK0720" → "TK720", as our flight numbers are written. */
function onwardFlight(text: string): string {
  const m = text.match(/^([A-Z0-9]{2})(\d{1,4})([A-Z]?)$/);
  return m ? `${m[1]}${Number(m[2])}${m[3]}` : text;
}

/** The PTM body: "TK0720 BOM 1Y 1B11K" and then names, which are skipped. */
export function parsePtm(header: PersonalHeader, body: readonly string[]): { data: PtmData; warnings: TelexWarning[] } {
  const data: PtmData = { from: header.from, to: header.to, part: header.part, last: false, transfers: [] };
  const totals = new Map<string, PtmData["transfers"][number]>();
  let unread = 0;
  for (const raw of body) {
    const line = raw.trim().toUpperCase().replace(/\s+/g, " ");
    if (line === "") continue;
    if (isEnd(line)) {
      data.last = line === "ENDPTM";
      break;
    }
    // Only the leading fields are read; the names after them are not.
    const m = line.match(/^([A-Z0-9]{3,7}) ([A-Z]{3}) (\d+)([A-Z]) (\d+)B(\d+)K(?: |$)/);
    if (!m) {
      unread++;
      continue;
    }
    const flight = onwardFlight(m[1]);
    const key = `${flight}|${m[2]}|${m[4]}`;
    const entry = totals.get(key) ?? { flight, destination: m[2], cls: m[4], pax: 0, bags: 0, weight: 0 };
    entry.pax += Number(m[3]);
    entry.bags += Number(m[5]);
    entry.weight += Number(m[6]);
    totals.set(key, entry);
  }
  data.transfers = [...totals.values()].sort(
    (a, b) => a.flight.localeCompare(b.flight) || a.destination.localeCompare(b.destination) || a.cls.localeCompare(b.cls),
  );
  return { data, warnings: unread > 0 ? [warn("unreadLines", { count: unread })] : [] };
}

/**
 * What is stored in place of the raw text (CLAUDE.md, 8. mérföldkő): the
 * header and the counts, rendered. It is also what a duplicate is known by.
 */
export function derivedText(
  type: "PSM" | "PTM",
  header: { flightNumber: string; dateText: string } | null,
  data: PsmData | PtmData,
): string {
  const route = type === "PSM" ? (data as PsmData).station : `${(data as PtmData).from}${(data as PtmData).to ?? ""}`;
  const lines = [type, header ? `${header.flightNumber}/${header.dateText} ${route} PART${data.part}` : "-"];
  if (type === "PSM") {
    for (const d of (data as PsmData).destinations) {
      lines.push(`-${d.destination} ${d.pax}PAX / ${d.ssr}SSR`);
      for (const c of d.codes) lines.push(`${c.code} ${c.byClass.map((x) => `${x.count}${x.cls}`).join(" ")}`);
    }
  } else {
    for (const t of (data as PtmData).transfers) lines.push(`${t.flight} ${t.destination} ${t.pax}${t.cls} ${t.bags}B${t.weight}K`);
  }
  lines.push(data.last ? `END${type}` : `ENDPART${data.part}`);
  return lines.join("\n");
}
