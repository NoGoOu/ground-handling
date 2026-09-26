import { isNil } from "./header";
import { warn, type TelexWarning } from "./warnings";

// CPM, the container/pallet distribution message (docs/messages.md, "CPM").
// The order of the fields in a position line differs by system, so they are
// told apart by their pattern: ULD id, weight, station, contour, category
// with its special codes.

export type Deck = "MAIN" | "LOWER";

export interface CpmPosition {
  position: string;
  deck: Deck;
  /** Lower deck: the hold, the first digit of the position; bulk has none. */
  hold: string | null;
  /** The section it is listed under ("RIGHT SIDE"), when there are sections. */
  side: string | null;
  empty: boolean;
  uld: string | null;
  weight: number | null;
  destination: string | null;
  contour: string | null;
  /** B baggage, C cargo, M mail, E equipment, X empty ULD. */
  category: string | null;
  /** Special codes: ELD, FKT, ELI, ELM, PER, BIG… */
  codes: string[];
}

export interface CpmData {
  /** From the header, or the ".TW" line (read as the total weight). */
  totalWeight: number | null;
  from: string | null;
  to: string | null;
  /** Header fields we do not know the meaning of yet ("4/1"). */
  headerExtra: string[];
  /** ".BUD/92404": per destination. */
  destinationTotals: { station: string; weight: number }[];
  positions: CpmPosition[];
  /** SI weight figures: ZFW, TOW, TAKE OFF FUEL… by name. */
  weights: { name: string; value: number }[];
  si: string[];
}

const ULD = /^[A-Z]{3}\d{4,5}[A-Z0-9]{2,3}$/;
const CATEGORY = /^([BCMEX])((?:\.[A-Z0-9]{3})*)$/;

/** Header fields after the registration: "1983.BUD" or "4/1.CANBUD". */
function headerFields(fields: readonly string[]): Pick<CpmData, "totalWeight" | "from" | "to" | "headerExtra"> {
  const result: Pick<CpmData, "totalWeight" | "from" | "to" | "headerExtra"> = {
    totalWeight: null,
    from: null,
    to: null,
    headerExtra: [],
  };
  for (const field of fields) {
    if (/^\d+$/.test(field)) result.totalWeight = Number(field);
    // A station is where the load was loaded: the departure station.
    else if (/^[A-Z]{3}$/.test(field)) result.from = field;
    else if (/^[A-Z]{6}$/.test(field)) [result.from, result.to] = [field.slice(0, 3), field.slice(3)];
    else result.headerExtra.push(field);
  }
  return result;
}

/** Where a position is when there is no section: letters on the main deck, digits in a hold. */
function place(position: string, section: { deck: Deck; side: string } | null): Pick<CpmPosition, "deck" | "hold"> {
  const deck: Deck = section?.deck ?? (/^(\d|BLK)/.test(position) ? "LOWER" : "MAIN");
  return { deck, hold: deck === "LOWER" && /^\d/.test(position) ? position[0] : null };
}

function parsePosition(
  line: string,
  section: { deck: Deck; side: string } | null,
  warnings: TelexWarning[],
): CpmPosition | null {
  const text = line.slice(1).trim();
  const cut = text.search(/[/.]/);
  const position = cut < 0 ? text : text.slice(0, cut);
  const rest = cut < 0 ? "" : text.slice(cut);
  if (!/^[A-Z0-9]{1,5}$/.test(position)) {
    warnings.push(warn("badPosition", { line }));
    return null;
  }
  const base: CpmPosition = {
    position,
    ...place(position, section),
    side: section?.side ?? null,
    empty: false,
    uld: null,
    weight: null,
    destination: null,
    contour: null,
    category: null,
    codes: [],
  };
  if (rest === "" || isNil(rest)) return { ...base, empty: true };
  for (const token of rest.slice(1).split("/")) {
    const category = token.match(CATEGORY);
    if (ULD.test(token) && !base.uld) base.uld = token;
    else if (/^\d+$/.test(token) && base.weight === null) base.weight = Number(token);
    else if (/^[A-Z]{3}$/.test(token) && !base.destination) base.destination = token;
    else if (/^Q[A-Z0-9]$/.test(token) && !base.contour) base.contour = token;
    else if (category && !base.category) {
      base.category = category[1];
      base.codes = category[2].split(".").filter(Boolean);
    } else warnings.push(warn("unknownField", { field: token, line }));
  }
  return base;
}

/** "ZFW=234408,ZF INDEX=41.46" and "TAKE OFF FUEL 111670,TRIP FUEL 98206". */
function weightsOf(text: string): CpmData["weights"] {
  return text.split(",").flatMap((part) => {
    const m = part.trim().match(/^([A-Z][A-Z .]*?)\s*(?:=|\s)\s*(-?\d+(?:\.\d+)?)$/);
    return m ? [{ name: m[1].trim(), value: Number(m[2]) }] : [];
  });
}

export function parseCpm(fields: readonly string[], body: readonly string[]): { data: CpmData; warnings: TelexWarning[] } {
  const warnings: TelexWarning[] = [];
  const data: CpmData = { ...headerFields(fields), destinationTotals: [], positions: [], weights: [], si: [] };
  let section: { deck: Deck; side: string } | null = null;
  let ended = false;
  for (const raw of body) {
    const line = raw.trim().toUpperCase().replace(/\s+/g, " ");
    if (ended) {
      warnings.push(warn("afterEnd", { line: raw.trim() }));
      continue;
    }
    const sectionMatch = line.match(/^(M|L)\/D(?: (.+))?$/);
    const total = line.match(/^\.([A-Z]{3})\/(\d+)$/);
    const totalWeight = line.match(/^\.TW\/(\d+)$/);
    if (line === "CPM END") ended = true;
    else if (sectionMatch) section = { deck: sectionMatch[1] === "M" ? "MAIN" : "LOWER", side: sectionMatch[2] ?? "" };
    else if (total) data.destinationTotals.push({ station: total[1], weight: Number(total[2]) });
    // Read as the total weight; the header may give it too.
    else if (totalWeight) data.totalWeight ??= Number(totalWeight[1]);
    else if (line.startsWith("-")) {
      const position = parsePosition(line, section, warnings);
      if (position) data.positions.push(position);
    } else if (/^SI\b/.test(line)) {
      const text = raw.trim().slice(2).trim();
      data.si.push(text);
      data.weights.push(...weightsOf(text.toUpperCase()));
    } else warnings.push(warn("unknownLine", { line: raw.trim() }));
  }
  return { data, warnings };
}
