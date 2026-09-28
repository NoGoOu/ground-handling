import { isNil } from "./header";
import { splitSi } from "./si";
import { warn, type TelexWarning } from "./warnings";

// CPM, the container/pallet distribution message (docs/messages.md, "CPM").
// The order of the fields in a position line differs by system, so they are
// told apart by their pattern: ULD id, weight, station, contour, category
// with its free quarters and special codes. A position may hold several items
// ("-52/BUD/47/BC/187/BY.VR3"): the weights and the categories pair up in
// order. The SI is free text, up to CPM END.

export type Deck = "MAIN" | "LOWER";

export interface CpmItem {
  weight: number | null;
  /** B baggage (BC business, BY economy), C cargo, M mail, E equipment, X empty ULD, D crew bags, Q urgent cargo. */
  category: string | null;
}

export interface CpmPosition {
  position: string;
  deck: Deck;
  /** Lower deck: the hold, the first digit of the position; bulk has none. */
  hold: string | null;
  /** The section it is listed under ("RIGHT SIDE"), when there are sections. */
  side: string | null;
  empty: boolean;
  uld: string | null;
  /** All the items together, gross. */
  weight: number | null;
  destination: string | null;
  contour: string | null;
  /** The first item's category. */
  category: string | null;
  items: CpmItem[];
  /** Free quarters: the digit after the category ("BY0") or VR on a bulk position ("VR3"). */
  freeQuarters: number | null;
  /** Special codes: ELD, FKT, ELI, ELM, PER, BIG, XOM, XCS… */
  codes: string[];
}

export interface CpmData {
  /** From the header, or the ".TW" line (read as the total weight, rule 53). */
  totalWeight: number | null;
  from: string | null;
  to: string | null;
  /** Header fields we do not know the meaning of yet ("4/1"). */
  headerExtra: string[];
  /** ".BUD/92404": per destination. */
  destinationTotals: { station: string; weight: number }[];
  positions: CpmPosition[];
  /** The SI block verbatim (not parsed). */
  si: string | null;
}

/** Crew bags: part of the aircraft's operating mass, not load. */
export const CREW_BAGS = "D";

const ULD = /^[A-Z]{3}\d{4,5}[A-Z0-9]{2,3}$/;
/** A category with its class letter (BC, BY), its free quarters and its codes: "BY0", "C.ELI", "D.VR1", "Q.XOM". */
const CATEGORY = /^(B[A-Z]?|C|M|E|X|D|Q)(\d)?((?:\.[A-Z0-9]{2,3})*)$/;
/** A contour: Q and one character ("Q5", "QM"); a lone Q is urgent cargo (approved decision). */
const CONTOUR = /^Q[A-Z0-9]$/;

/** Header fields after the registration: "1983.BUD" or "4/1.CANBUD"; none at all in "LH1338/27.DAIQT". */
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
    items: [],
    freeQuarters: null,
    codes: [],
  };
  if (rest === "" || isNil(rest)) return { ...base, empty: true };

  const weights: number[] = [];
  const categories: string[] = [];
  for (const token of rest.slice(1).split("/")) {
    const category = token.match(CATEGORY);
    if (ULD.test(token) && !base.uld) base.uld = token;
    else if (/^\d+$/.test(token)) weights.push(Number(token));
    else if (/^[A-Z]{3}$/.test(token) && !base.destination) base.destination = token;
    else if (CONTOUR.test(token) && !base.contour) base.contour = token;
    else if (category) {
      categories.push(category[1]);
      if (category[2] !== undefined) base.freeQuarters = Number(category[2]);
      for (const code of category[3].split(".").filter(Boolean)) {
        // VR on a bulk position: its free quarters.
        const vr = code.match(/^VR(\d)$/);
        if (vr) base.freeQuarters = Number(vr[1]);
        else if (!base.codes.includes(code)) base.codes.push(code);
      }
    } else warnings.push(warn("unknownField", { field: token, line }));
  }
  const count = Math.max(weights.length, categories.length);
  base.items = Array.from({ length: count }, (_, i) => ({ weight: weights[i] ?? null, category: categories[i] ?? null }));
  base.weight = weights.length > 0 ? weights.reduce((a, b) => a + b, 0) : null;
  base.category = categories[0] ?? null;
  return base;
}

export function parseCpm(fields: readonly string[], body: readonly string[]): { data: CpmData; warnings: TelexWarning[] } {
  const warnings: TelexWarning[] = [];
  const { body: lines, si, after } = splitSi(body, (line) => line.trim().toUpperCase().replace(/\s+/g, " ") === "CPM END");
  const data: CpmData = { ...headerFields(fields), destinationTotals: [], positions: [], si };
  let section: { deck: Deck; side: string } | null = null;
  for (const raw of lines) {
    const line = raw.trim().toUpperCase().replace(/\s+/g, " ");
    if (line === "") continue;
    const sectionMatch = line.match(/^(M|L)\/D(?: (.+))?$/);
    const total = line.match(/^\.([A-Z]{3})\/(\d+)$/);
    const totalWeight = line.match(/^\.TW\/(\d+)$/);
    if (sectionMatch) section = { deck: sectionMatch[1] === "M" ? "MAIN" : "LOWER", side: sectionMatch[2] ?? "" };
    else if (total) data.destinationTotals.push({ station: total[1], weight: Number(total[2]) });
    // Read as the total weight; the header may give it too.
    else if (totalWeight) data.totalWeight ??= Number(totalWeight[1]);
    else if (line.startsWith("-")) {
      const position = parsePosition(line, section, warnings);
      if (position) data.positions.push(position);
    } else warnings.push(warn("unknownLine", { line: raw.trim() }));
  }
  for (const line of after) if (line.trim() !== "") warnings.push(warn("afterEnd", { line: line.trim() }));
  return { data, warnings };
}

/** The items of a position; a CPM stored before the 8. mérföldkő has one item at most. */
export const itemsOf = (position: CpmPosition): CpmItem[] =>
  position.items ?? (position.weight !== null || position.category ? [{ weight: position.weight, category: position.category }] : []);

/** The load weight of a position: its items without the crew bags. */
export const loadWeight = (position: CpmPosition) =>
  itemsOf(position).reduce((total, item) => total + (item.category === CREW_BAGS ? 0 : (item.weight ?? 0)), 0);
