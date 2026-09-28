import { splitSi } from "./si";
import { warn, type TelexWarning } from "./warnings";

// LDM, the load message (docs/messages.md, "LDM"). Header fields:
// configuration and crew ("Y150.2/3", "C20M138.2/4"). Per destination:
// "-OSR.0/0/0/0.T1983.MD1305.1/50.2/0.3/351.4/277.PAX/0.PAD/0", or in the
// Lufthansa variant the main deck without a prefix:
// "-BUD.96/48/2/1.0.T3336.1/1511.…PAX/12/134". Then special items
// (".ELD/A9/335.FKT/1/50") and ".JMP/0.CRW/0.PAD/0/3". The SI is free text.

export interface LdmLeg {
  destination: string;
  /** Male / female / child / infant. */
  passengers: { male: number; female: number; child: number; infant: number } | null;
  /** T: all the load in kg. */
  totalLoad: number | null;
  /** MD, or the bare number after the passengers: main deck (freighter). */
  mainDeck: number | null;
  /** Hold number → kg, gross. */
  holds: { hold: string; weight: number }[];
  /** PAX: seated passengers per class, in the configuration's order (no infants). */
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
  /** JMP: jump seat. */
  jumpSeats: number | null;
  /** CRW and PAD (per class) of the extra line, as given; their meaning is to be confirmed. */
  crw: number[] | null;
  pad: number[] | null;
  /** The SI block verbatim (not parsed). */
  si: string | null;
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
    // Lufthansa: the main deck without a prefix, after the passengers.
    else if ((m = token.match(/^(\d+)$/)) && leg.passengers && leg.mainDeck === null) leg.mainDeck = +m[1];
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
  const { body: lines, si } = splitSi(body);
  const data: LdmData = {
    configuration: fields.find((f) => /^(\d+[A-Z]|[A-Z]\d+)+$/.test(f)) ?? null,
    crew: crew ? { cockpit: +crew[1], cabin: +crew[2] } : null,
    legs: [],
    specialItems: [],
    jumpSeats: null,
    crw: null,
    pad: null,
    si,
  };
  for (const raw of lines) {
    const line = raw.trim().toUpperCase();
    if (line === "") continue;
    if (/^-[A-Z]{3}\./.test(line)) {
      data.legs.push(parseLeg(line, warnings));
    } else if (line.startsWith(".")) {
      for (const item of line.slice(1).split(".")) {
        let m: RegExpMatchArray | null;
        if ((m = item.match(/^JMP\/(\d+)$/))) data.jumpSeats = +m[1];
        else if ((m = item.match(/^CRW\/([\d/]+)$/))) data.crw = numbers(m[1]);
        else if ((m = item.match(/^PAD\/([\d/]+)$/))) data.pad = numbers(m[1]);
        else if ((m = item.match(/^([A-Z]{3})\/([A-Z0-9]+)\/(\d+)$/))) {
          data.specialItems.push({ code: m[1], position: m[2], weight: +m[3] });
        } else if (item !== "") warnings.push(warn("unknownField", { field: item, line }));
      }
    } else {
      warnings.push(warn("unknownLine", { line: raw.trim() }));
    }
  }
  return { data, warnings };
}
