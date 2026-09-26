import type { CpmData } from "./cpm";
import type { LdmData } from "./ldm";
import type { UcmData } from "./ucm";
import { warn, type TelexWarning } from "./warnings";

// Checks of the messages (docs/messages.md; CLAUDE.md, 7. mérföldkő,
// "Feldolgozás és ellenőrzés"). They only warn: nothing is rejected.

const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);

/** LDM: main deck + holds = T, and the passengers add up to PAX. */
export function checkLdm(data: LdmData): TelexWarning[] {
  return data.legs.flatMap((leg) => {
    const warnings: TelexWarning[] = [];
    const load = (leg.mainDeck ?? 0) + sum(leg.holds.map((h) => h.weight));
    if (leg.totalLoad !== null && load !== leg.totalLoad) {
      warnings.push(warn("ldmLoadSum", { destination: leg.destination, total: leg.totalLoad, sum: load }));
    }
    if (leg.passengers && leg.paxByClass.length > 0) {
      const { male, female, child, infant } = leg.passengers;
      const people = male + female + child + infant;
      const pax = sum(leg.paxByClass);
      if (people !== pax) warnings.push(warn("ldmPaxSum", { destination: leg.destination, pax, sum: people }));
    }
    return warnings;
  });
}

const weight = (name: string, data: CpmData) => data.weights.find((w) => w.name === name)?.value;

/** CPM: the positions add up to the total weight, and TOW = ZFW + take-off fuel. */
export function checkCpm(data: CpmData): TelexWarning[] {
  const warnings: TelexWarning[] = [];
  const positions = sum(data.positions.map((p) => p.weight ?? 0));
  if (data.totalWeight !== null && positions !== data.totalWeight) {
    warnings.push(warn("cpmWeightSum", { total: data.totalWeight, sum: positions }));
  }
  const [tow, zfw, fuel] = [weight("TOW", data), weight("ZFW", data), weight("TAKE OFF FUEL", data)];
  if (tow !== undefined && zfw !== undefined && fuel !== undefined && tow !== zfw + fuel) {
    warnings.push(warn("cpmTakeOffWeight", { tow, zfw, fuel }));
  }
  return warnings;
}

/** CPM weight by deck and by hold; bulk (no hold number) separately. */
function cpmLoad(cpm: CpmData) {
  const holds = new Map<string, number>();
  let bulk = 0;
  for (const p of cpm.positions) {
    if (p.deck !== "LOWER") continue;
    if (p.hold) holds.set(p.hold, (holds.get(p.hold) ?? 0) + (p.weight ?? 0));
    else bulk += p.weight ?? 0;
  }
  const mainDeck = sum(cpm.positions.filter((p) => p.deck === "MAIN").map((p) => p.weight ?? 0));
  return { mainDeck, holds, bulk };
}

/**
 * LDM and CPM of the same flight part: the main deck and the holds weigh the
 * same. Bulk has no hold number in the CPM, so with bulk only the lower deck
 * as a whole is compared.
 */
export function compareLdmCpm(ldm: LdmData, cpm: CpmData): TelexWarning[] {
  const warnings: TelexWarning[] = [];
  const ldmMain = sum(ldm.legs.map((leg) => leg.mainDeck ?? 0));
  const ldmHolds = new Map<string, number>();
  for (const { hold, weight: kg } of ldm.legs.flatMap((leg) => leg.holds)) ldmHolds.set(hold, (ldmHolds.get(hold) ?? 0) + kg);
  const load = cpmLoad(cpm);
  if (ldmMain !== load.mainDeck) warnings.push(warn("ldmCpmMainDeck", { ldm: ldmMain, cpm: load.mainDeck }));
  if (load.bulk > 0) {
    const ldmLower = sum([...ldmHolds.values()]);
    const cpmLower = sum([...load.holds.values()]) + load.bulk;
    if (ldmLower !== cpmLower) warnings.push(warn("ldmCpmLowerDeck", { ldm: ldmLower, cpm: cpmLower }));
    return warnings;
  }
  const holds = [...new Set([...ldmHolds.keys(), ...load.holds.keys()])].sort();
  for (const hold of holds) {
    const [a, b] = [ldmHolds.get(hold) ?? 0, load.holds.get(hold) ?? 0];
    if (a !== b) warnings.push(warn("ldmCpmHold", { hold, ldm: a, cpm: b }));
  }
  return warnings;
}

/**
 * UCM OUT and CPM of the same departure: the UCM's E ULDs (the bases of the
 * stacks) are the CPM's ELD positions, and its X ULDs are not in the CPM.
 */
export function compareUcmCpm(ucm: UcmData, cpm: CpmData): TelexWarning[] {
  if (ucm.direction !== "OUT") return [];
  const warnings: TelexWarning[] = [];
  const bases = new Set(ucm.items.filter((i) => i.category === "E").map((i) => i.uld));
  const stacks = cpm.positions.filter((p) => p.uld && p.codes.includes("ELD"));
  const positionOf = new Map(cpm.positions.filter((p) => p.uld).map((p) => [p.uld!, p.position]));
  for (const uld of bases) {
    if (!stacks.some((p) => p.uld === uld)) warnings.push(warn("ucmBaseNotInCpm", { uld }));
  }
  for (const p of stacks) {
    if (!bases.has(p.uld!)) warnings.push(warn("cpmStackNotInUcm", { uld: p.uld!, position: p.position }));
  }
  for (const item of ucm.items.filter((i) => i.category === "X")) {
    const position = positionOf.get(item.uld);
    if (position) warnings.push(warn("ucmEmptyInCpm", { uld: item.uld, position }));
  }
  return warnings;
}

/**
 * The delay codes against the delay (rule 7: effective ATD − STD). No check
 * while there is no ATD; codes without minutes count as 0.
 */
export function checkDelays(delays: readonly { minutes: number | null }[], delay: number | null): TelexWarning[] {
  if (delay === null) return [];
  const total = sum(delays.map((d) => d.minutes ?? 0));
  return total === delay ? [] : [warn("delaySum", { sum: total, delay })];
}
