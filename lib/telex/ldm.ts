import { warn, type TelexWarning } from "./warnings";

// LDM, the load message (docs/messages.md, "LDM"). Header fields:
// configuration and crew ("Y150.2/3", "0Y.2/1"). Per destination:
// "-OSR.0/0/0/0.T1983.MD1305.1/50.2/0.3/351.4/277.PAX/0.PAD/0", special items
// ".ELD/A9/335.FKT/1/50", and SI with a breakdown ("C/0.E/1983.M/0").

export interface LdmLeg {
  destination: string;
  /** Male / female / child / infant. */
  passengers: { male: number; female: number; child: number; infant: number } | null;
  /** T: all the load in kg. */
  totalLoad: number | null;
  /** MD: main deck (freighter). */
  mainDeck: number | null;
  /** Hold number → kg. */
  holds: { hold: string; weight: number }[];
  /** PAX: per class, as given ("134", "10/124"). */
  paxByClass: number[];
  /** PAD, as given; its meaning is to be confirmed. */
  pad: number[];
}

export interface LdmData {
  /** "Y150": seats per class; "0Y" on a freighter. */
  configuration: string | null;
  /** "2/3": cockpit / cabin. */
  crew: { cockpit: number; cabin: number } | null;
  legs: LdmLeg[];
  /** ".ELD/A9/335", ".FKT/1/50": code, position or hold, kg. */
  specialItems: { code: string; position: string; weight: number }[];
  /** SI breakdown: station, then key/value pairs ("C/0", "BP/57"; TB to be confirmed). */
  si: { station: string | null; entries: { key: string; value: number }[]; text: string }[];
}

const numbers = (text: string) => text.split("/").map(Number);

function parseLeg(line: string, warnings: TelexWarning[]): LdmLeg {
  const [destination, ...tokens] = line.slice(1).split(".").map((t) => t.trim());
  const leg: LdmLeg = {
    destination,
    passengers: null,
    totalLoad: null,
    mainDeck: null,
    holds: [],
    paxByClass: [],
    pad: [],
  };
  for (const token of tokens) {
    let m: RegExpMatchArray | null;
    if ((m = token.match(/^(\d+)\/(\d+)\/(\d+)\/(\d+)$/)) && !leg.passengers) {
      leg.passengers = { male: +m[1], female: +m[2], child: +m[3], infant: +m[4] };
    } else if ((m = token.match(/^T(\d+)$/))) leg.totalLoad = +m[1];
    else if ((m = token.match(/^MD(\d+)$/))) leg.mainDeck = +m[1];
    else if ((m = token.match(/^(\d)\/(\d+)$/))) leg.holds.push({ hold: m[1], weight: +m[2] });
    else if ((m = token.match(/^PAX\/([\d/]+)$/))) leg.paxByClass = numbers(m[1]);
    else if ((m = token.match(/^PAD\/([\d/]+)$/))) leg.pad = numbers(m[1]);
    else if (token !== "") warnings.push(warn("unknownField", { field: token, line }));
  }
  return leg;
}

export function parseLdm(fields: readonly string[], body: readonly string[]): { data: LdmData; warnings: TelexWarning[] } {
  const warnings: TelexWarning[] = [];
  const crew = fields.map((f) => f.match(/^(\d+)\/(\d+)$/)).find(Boolean);
  const data: LdmData = {
    configuration: fields.find((f) => /^(\d+[A-Z]|[A-Z]\d+)+$/.test(f)) ?? null,
    crew: crew ? { cockpit: +crew[1], cabin: +crew[2] } : null,
    legs: [],
    specialItems: [],
    si: [],
  };
  for (const raw of body) {
    const line = raw.trim().toUpperCase();
    if (/^-[A-Z]{3}\./.test(line)) {
      data.legs.push(parseLeg(line, warnings));
    } else if (line.startsWith(".")) {
      for (const item of line.slice(1).split(".")) {
        const m = item.match(/^([A-Z]{3})\/([A-Z0-9]+)\/(\d+)$/);
        if (m) data.specialItems.push({ code: m[1], position: m[2], weight: +m[3] });
        else if (item !== "") warnings.push(warn("unknownField", { field: item, line }));
      }
    } else if (/^SI\b/.test(line)) {
      const text = raw.trim().slice(2).trim();
      const station = text.match(/^([A-Z]{3})\s+/)?.[1] ?? null;
      const rest = station ? text.slice(4).trim() : text;
      const pairs = rest.split(".").map((p) => p.trim().match(/^([A-Z]{1,3})\/(\d+)$/));
      // A breakdown when every part is "KEY/number"; otherwise free text.
      data.si.push({
        station: pairs.every(Boolean) ? station : null,
        entries: pairs.every(Boolean) ? pairs.map((p) => ({ key: p![1], value: +p![2] })) : [],
        text,
      });
    } else {
      warnings.push(warn("unknownLine", { line: raw.trim() }));
    }
  }
  return { data, warnings };
}
