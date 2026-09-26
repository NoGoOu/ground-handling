import { compareLdmCpm, compareUcmCpm } from "./checks";
import type { CpmData } from "./cpm";
import type { LdmData } from "./ldm";
import type { MessageData } from "./parse";
import type { UcmData } from "./ucm";
import type { TelexWarning } from "./warnings";

// The infographic of a flight part (CLAUDE.md, 7. mérföldkő): a fixed summary
// of its current messages, inbound or ours. Each block names the message it
// comes from and when that came in. Pure.

export interface InfographicSource {
  messageId: string;
  type: string;
  receivedAt: Date;
}

export type CurrentMessage = MessageData & { id: string; receivedAt: Date; warnings: TelexWarning[] };

export interface Infographic {
  passengers: { male: number; female: number; child: number; infant: number; total: number; source: InfographicSource } | null;
  load: {
    total: number | null;
    mainDeck: number | null;
    holds: { hold: string; weight: number }[];
    bulk: number | null;
    /** C cargo, B baggage, M mail, E equipment… in kg; BP baggage pieces. */
    byCategory: { key: string; value: number }[];
    source: InfographicSource;
  } | null;
  /** Loaded positions of the CPM. */
  ulds: {
    positions: { position: string; uld: string | null; weight: number | null; category: string | null; codes: string[]; destination: string | null }[];
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
  weights: { values: { name: string; value: number }[]; source: InfographicSource } | null;
  /** The current messages' own warnings and the checks across them. */
  warnings: TelexWarning[];
}

const sourceOf = (m: CurrentMessage): InfographicSource => ({ messageId: m.id, type: m.type, receivedAt: m.receivedAt });
const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);

function latest<T extends CurrentMessage["type"]>(messages: readonly CurrentMessage[], type: T) {
  return messages
    .filter((m): m is Extract<CurrentMessage, { type: T }> => m.type === type)
    .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime())[0];
}

const CATEGORY_KEYS = ["C", "B", "M", "E", "BP"];

function loadFromLdm(ldm: LdmData) {
  const holds = new Map<string, number>();
  for (const h of ldm.legs.flatMap((leg) => leg.holds)) holds.set(h.hold, (holds.get(h.hold) ?? 0) + h.weight);
  const byCategory = new Map<string, number>();
  for (const e of ldm.si.flatMap((s) => s.entries)) {
    if (CATEGORY_KEYS.includes(e.key)) byCategory.set(e.key, (byCategory.get(e.key) ?? 0) + e.value);
  }
  const totals = ldm.legs.map((leg) => leg.totalLoad).filter((t): t is number => t !== null);
  const mainDecks = ldm.legs.map((leg) => leg.mainDeck).filter((t): t is number => t !== null);
  return {
    total: totals.length > 0 ? sum(totals) : null,
    mainDeck: mainDecks.length > 0 ? sum(mainDecks) : null,
    holds: [...holds].map(([hold, weight]) => ({ hold, weight })),
    bulk: null,
    byCategory: [...byCategory].map(([key, value]) => ({ key, value })),
  };
}

function loadFromCpm(cpm: CpmData) {
  const holds = new Map<string, number>();
  let bulk = 0;
  const byCategory = new Map<string, number>();
  for (const p of cpm.positions) {
    if (p.empty || p.weight === null) continue;
    if (p.deck === "LOWER") {
      if (p.hold) holds.set(p.hold, (holds.get(p.hold) ?? 0) + p.weight);
      else bulk += p.weight;
    }
    if (p.category) byCategory.set(p.category, (byCategory.get(p.category) ?? 0) + p.weight);
  }
  const mainDeck = sum(cpm.positions.filter((p) => p.deck === "MAIN").map((p) => p.weight ?? 0));
  return {
    total: cpm.totalWeight ?? sum(cpm.positions.map((p) => p.weight ?? 0)),
    mainDeck: mainDeck > 0 ? mainDeck : null,
    holds: [...holds].sort(([a], [b]) => a.localeCompare(b)).map(([hold, weight]) => ({ hold, weight })),
    bulk: bulk > 0 ? bulk : null,
    byCategory: [...byCategory].map(([key, value]) => ({ key, value })),
  };
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
  if (load && ldm && cpm && load.byCategory.length === 0) load.byCategory = loadFromCpm(cpm.data).byCategory;

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
              codes: p.codes,
              destination: p.destination,
            })),
            source: sourceOf(cpm),
          }
        : null,
    stacks,
    specialCodes: special.length > 0 ? { codes: special, source: sourceOf((cpm ?? ldm)!) } : null,
    weights: cpm && cpm.data.weights.length > 0 ? { values: cpm.data.weights, source: sourceOf(cpm) } : null,
    warnings: warnings.filter((w) => {
      const key = JSON.stringify(w);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  };
}
