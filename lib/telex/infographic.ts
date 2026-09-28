import { compareLdmCpm, compareUcmCpm } from "./checks";
import { CREW_BAGS, itemsOf, loadWeight, type CpmData, type CpmItem } from "./cpm";
import type { LdmData } from "./ldm";
import type { MessageData } from "./parse";
import type { PtmData } from "./psm";
import { slotOf } from "./slot";
import type { UcmData } from "./ucm";
import type { TelexWarning } from "./warnings";

// The infographic of a flight part (CLAUDE.md, 7. and 8. mérföldkő): a fixed
// summary of its current messages, inbound or ours. On top the SI of the
// latest LDM and CPM as it came (a framed instruction, a DAA); then the
// passengers, the load, the positions with their items and free quarters,
// urgent cargo and crew bags apart, the special needs (PSM), the transfers
// (PTM) and the slot. Each block names the message it comes from and when
// that came in. Pure.

export interface InfographicSource {
  messageId: string;
  type: string;
  receivedAt: Date;
}

export type CurrentMessage = MessageData & { id: string; receivedAt: Date; warnings: TelexWarning[] };

export interface Infographic {
  /** The SI of the latest LDM and CPM, verbatim. */
  si: { type: "LDM" | "CPM"; text: string; source: InfographicSource }[];
  passengers: { male: number; female: number; child: number; infant: number; total: number; source: InfographicSource } | null;
  load: {
    total: number | null;
    mainDeck: number | null;
    holds: { hold: string; weight: number }[];
    bulk: number | null;
    /** Per category in kg (crew bags apart). */
    byCategory: { key: string; value: number }[];
    /** D: crew bags, not load. */
    crewBags: number | null;
    source: InfographicSource;
  } | null;
  /** Loaded positions of the CPM. */
  ulds: {
    positions: {
      position: string;
      uld: string | null;
      weight: number | null;
      category: string | null;
      /** The items of the position: category and kg. */
      items: CpmItem[];
      freeQuarters: number | null;
      /** Holds urgent cargo (Q). */
      urgent: boolean;
      codes: string[];
      destination: string | null;
    }[];
    source: InfographicSource;
  } | null;
  /** Empty ULD stacks: the bases (ELD) with the stack's weight; the UCM's count of bases and empties. */
  stacks: {
    positions: { position: string; uld: string | null; weight: number | null }[];
    ucm: { bases: number; empties: number } | null;
    sources: InfographicSource[];
  } | null;
  /** Special codes with their positions. */
  specialCodes: { codes: { code: string; positions: string[] }[]; source: InfographicSource } | null;
  /** PSM: per code the count per class, all parts together. */
  specialNeeds: { codes: { code: string; byClass: { cls: string; count: number }[] }[]; sources: InfographicSource[] } | null;
  /** PTM: per onward flight, destination and class, all parts together. */
  transfers: { rows: PtmData["transfers"]; sources: InfographicSource[] } | null;
  /** The slot of the departure (SAM, SRM). */
  slot: {
    title: string;
    ctot: Date;
    taxiMinutes: number;
    targetOffBlock: Date;
    regulations: string[];
    cause: { reason: string; delayCode: string | null } | null;
    source: InfographicSource;
  } | null;
  /** The current messages' own warnings and the checks across them. */
  warnings: TelexWarning[];
}

const sourceOf = (m: CurrentMessage): InfographicSource => ({
  messageId: m.id,
  type: m.type === "SLOT" ? m.data.title : m.type,
  receivedAt: m.receivedAt,
});
const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);

function latest<T extends CurrentMessage["type"]>(messages: readonly CurrentMessage[], type: T) {
  return messages
    .filter((m): m is Extract<CurrentMessage, { type: T }> => m.type === type)
    .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime())[0];
}

function loadFromLdm(ldm: LdmData) {
  const holds = new Map<string, number>();
  for (const h of ldm.legs.flatMap((leg) => leg.holds)) holds.set(h.hold, (holds.get(h.hold) ?? 0) + h.weight);
  // The LDM gives the categories only in its SI, which is not parsed (8. mérföldkő).
  const byCategory = new Map<string, number>();
  const totals = ldm.legs.map((leg) => leg.totalLoad).filter((t): t is number => t !== null);
  const mainDecks = ldm.legs.map((leg) => leg.mainDeck).filter((t): t is number => t !== null);
  return {
    total: totals.length > 0 ? sum(totals) : null,
    mainDeck: mainDecks.length > 0 ? sum(mainDecks) : null,
    holds: [...holds].map(([hold, weight]) => ({ hold, weight })),
    bulk: null,
    byCategory: [...byCategory].map(([key, value]) => ({ key, value })),
    crewBags: null,
  };
}

function loadFromCpm(cpm: CpmData) {
  const holds = new Map<string, number>();
  let bulk = 0;
  const byCategory = new Map<string, number>();
  let crewBags = 0;
  for (const p of cpm.positions) {
    if (p.empty) continue;
    // Crew bags are not load.
    if (p.deck === "LOWER") {
      if (p.hold) holds.set(p.hold, (holds.get(p.hold) ?? 0) + loadWeight(p));
      else bulk += loadWeight(p);
    }
    for (const item of itemsOf(p)) {
      if (item.category === CREW_BAGS) crewBags += item.weight ?? 0;
      else if (item.category && item.weight !== null) byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + item.weight);
    }
  }
  const mainDeck = sum(cpm.positions.filter((p) => p.deck === "MAIN").map(loadWeight));
  return {
    total: cpm.totalWeight ?? sum(cpm.positions.map(loadWeight)),
    mainDeck: mainDeck > 0 ? mainDeck : null,
    holds: [...holds].sort(([a], [b]) => a.localeCompare(b)).map(([hold, weight]) => ({ hold, weight })),
    bulk: bulk > 0 ? bulk : null,
    byCategory: [...byCategory].map(([key, value]) => ({ key, value })),
    crewBags: crewBags > 0 ? crewBags : null,
  };
}

/** The current parts of all PSMs (PART1, PART2…) together. */
function specialNeedsOf(psms: readonly Extract<CurrentMessage, { type: "PSM" }>[]) {
  const counts = new Map<string, Map<string, number>>();
  for (const psm of psms) {
    for (const code of psm.data.destinations.flatMap((d) => d.codes)) {
      const byClass = counts.get(code.code) ?? new Map<string, number>();
      for (const c of code.byClass) byClass.set(c.cls, (byClass.get(c.cls) ?? 0) + c.count);
      counts.set(code.code, byClass);
    }
  }
  return [...counts].map(([code, byClass]) => ({
    code,
    byClass: [...byClass].filter(([, count]) => count > 0).map(([cls, count]) => ({ cls, count })),
  }));
}

/** The current parts of all PTMs together. */
function transfersOf(ptms: readonly Extract<CurrentMessage, { type: "PTM" }>[]): PtmData["transfers"] {
  const rows = new Map<string, PtmData["transfers"][number]>();
  for (const t of ptms.flatMap((ptm) => ptm.data.transfers)) {
    const key = `${t.flight}|${t.destination}|${t.cls}`;
    const row = rows.get(key) ?? { ...t, pax: 0, bags: 0, weight: 0 };
    row.pax += t.pax;
    row.bags += t.bags;
    row.weight += t.weight;
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => a.flight.localeCompare(b.flight) || a.destination.localeCompare(b.destination));
}

function specialFromCpm(cpm: CpmData) {
  const codes = new Map<string, string[]>();
  for (const p of cpm.positions) for (const code of p.codes) codes.set(code, [...(codes.get(code) ?? []), p.position]);
  return [...codes].map(([code, positions]) => ({ code, positions }));
}

function specialFromLdm(ldm: LdmData) {
  const codes = new Map<string, string[]>();
  for (const item of ldm.specialItems) codes.set(item.code, [...(codes.get(item.code) ?? []), item.position]);
  return [...codes].map(([code, positions]) => ({ code, positions }));
}

function ucmCounts(ucm: UcmData) {
  return {
    bases: ucm.items.filter((i) => i.category === "E").length,
    empties: ucm.items.filter((i) => i.category === "X").length,
  };
}

export function buildInfographic(current: readonly CurrentMessage[]): Infographic {
  const ldm = latest(current, "LDM");
  const cpm = latest(current, "CPM");
  // A flight part has one UCM direction; OUT is the one checked against the CPM.
  const ucm = latest(current, "UCM");
  const psms = current.filter((m): m is Extract<CurrentMessage, { type: "PSM" }> => m.type === "PSM");
  const ptms = current.filter((m): m is Extract<CurrentMessage, { type: "PTM" }> => m.type === "PTM");
  const slotMessage = current
    .filter((m): m is Extract<CurrentMessage, { type: "SLOT" }> => m.type === "SLOT" && !!slotOf(m.data))
    .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime())[0];
  const slot = slotMessage ? slotOf(slotMessage.data)! : null;
  const specialNeeds = specialNeedsOf(psms);
  const transfers = transfersOf(ptms);

  const passengerLegs = ldm?.data.legs.filter((leg) => leg.passengers) ?? [];
  const passengers =
    ldm && passengerLegs.length > 0
      ? (() => {
          const [male, female, child, infant] = (["male", "female", "child", "infant"] as const).map((key) =>
            sum(passengerLegs.map((leg) => leg.passengers![key])),
          );
          return { male, female, child, infant, total: male + female + child + infant, source: sourceOf(ldm) };
        })()
      : null;

  // The LDM gives the load; without one the CPM's positions do.
  const load = ldm && ldm.data.legs.length > 0 ? { ...loadFromLdm(ldm.data), source: sourceOf(ldm) } : cpm ? { ...loadFromCpm(cpm.data), source: sourceOf(cpm) } : null;
  if (load && ldm && cpm) {
    const fromCpm = loadFromCpm(cpm.data);
    if (load.byCategory.length === 0) load.byCategory = fromCpm.byCategory;
    load.crewBags = fromCpm.crewBags;
  }

  const loaded = cpm?.data.positions.filter((p) => !p.empty) ?? [];
  const stackPositions = loaded.filter((p) => p.codes.includes("ELD"));
  const stacks =
    stackPositions.length > 0 || ucm
      ? {
          positions: stackPositions.map((p) => ({ position: p.position, uld: p.uld, weight: p.weight })),
          ucm: ucm ? ucmCounts(ucm.data) : null,
          sources: [cpm && stackPositions.length > 0 ? sourceOf(cpm) : null, ucm ? sourceOf(ucm) : null].filter(
            (s): s is InfographicSource => !!s,
          ),
        }
      : null;

  const special = cpm ? specialFromCpm(cpm.data) : ldm ? specialFromLdm(ldm.data) : [];
  const warnings = [
    ...current.flatMap((m) => m.warnings),
    ...(ldm && cpm ? compareLdmCpm(ldm.data, cpm.data) : []),
    ...(ucm && cpm ? compareUcmCpm(ucm.data, cpm.data) : []),
  ];
  const seen = new Set<string>();

  return {
    // Messages stored before the 8. mérföldkő have a parsed SI: only a text goes on top.
    si: [ldm, cpm].flatMap((m) => (m && typeof m.data.si === "string" ? [{ type: m.type, text: m.data.si, source: sourceOf(m) }] : [])),
    passengers,
    load,
    ulds:
      cpm && loaded.length > 0
        ? {
            positions: loaded.map((p) => ({
              position: p.position,
              uld: p.uld,
              weight: p.weight,
              category: p.category,
              items: itemsOf(p),
              freeQuarters: p.freeQuarters ?? null,
              urgent: itemsOf(p).some((item) => item.category === "Q"),
              codes: p.codes,
              destination: p.destination,
            })),
            source: sourceOf(cpm),
          }
        : null,
    stacks,
    specialCodes: special.length > 0 ? { codes: special, source: sourceOf((cpm ?? ldm)!) } : null,
    specialNeeds: specialNeeds.length > 0 ? { codes: specialNeeds, sources: psms.map(sourceOf) } : null,
    transfers: transfers.length > 0 ? { rows: transfers, sources: ptms.map(sourceOf) } : null,
    slot:
      slot && slotMessage
        ? {
            title: slot.title,
            ctot: slot.ctot,
            taxiMinutes: slot.taxiMinutes,
            targetOffBlock: slot.targetOffBlock,
            regulations: slot.regulations,
            cause: slot.cause,
            source: sourceOf(slotMessage),
          }
        : null,
    warnings: warnings.filter((w) => {
      const key = JSON.stringify(w);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  };
}
