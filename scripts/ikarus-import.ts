import "dotenv/config";
import { existsSync, statSync } from "node:fs";
import { createIkarusAirlines, defaultImportUser, ikarusProfileId, loadLiveStates, removeIkarusData } from "@/lib/data/ikarus";
import { applyImport, loadAirlines, loadExistingFlights, type ImportSummary } from "@/lib/data/imports";
import { prisma } from "@/lib/db";
import { liveChanges, liveData, planIkarus, type LiveState } from "@/lib/ikarus/convert";
import { errorCounts, mergeSnapshots } from "@/lib/ikarus/merge";
import type { IkarusTurnaround } from "@/lib/ikarus/pairing";
import { readSnapshotDir } from "@/lib/ikarus/read";
import type { RecordError } from "@/lib/ikarus/snapshot";
import { diffImport, type AirlineInfo, type ImportDiff } from "@/lib/import/diff";
import type { ImportedTurnaround } from "@/lib/import/pairing";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { isProduction } from "@/lib/ops/config";
import { addDays, localDayRange, parseLocalDate, toLocalDate } from "@/lib/time";

// Real flights from the AODB backup into a development or demo instance
// (CLAUDE.md, "Közbeiktatva: valós járatok az Ikarus-mentésből", "Futtatás"):
//   npx tsx scripts/ikarus-import.ts --dir <mappa> [--from ÉÉÉÉ-HH-NN] [--to ÉÉÉÉ-HH-NN] [--apply] [--user <név>]
//   npx tsx scripts/ikarus-import.ts remove
// Without --apply it is a dry run: the summary, and nothing written. The
// folder stays outside the repository; nothing of it is printed but counts.

const t = messages.ikarus;

function option(name: string): string | null {
  const at = process.argv.indexOf(`--${name}`);
  return at > 0 ? (process.argv[at + 1] ?? null) : null;
}

function day(name: string): string | null {
  const value = option(name);
  if (value === null) return null;
  if (!parseLocalDate(value)) throw new Error(fmt(t.badDate, { option: `--${name}` }));
  return value;
}

/** The days around the range read too, so turnarounds across its edges pair and departures still in the window count. */
const MARGIN_DAYS = 2;

interface Prepared {
  turnarounds: { ikarus: IkarusTurnaround; imported: ImportedTurnaround }[];
  diff: ImportDiff;
  live: Map<string, LiveState>;
  newAirlineCodes: string[];
}

/** The dry run against the database as it is now. */
async function prepare(plan: ReturnType<typeof planIkarus>, range: { start: string; end: string }): Promise<Prepared> {
  const airlines = await loadAirlines();
  const known = new Set(airlines.map((a) => a.code));
  const newAirlineCodes = [...new Set(plan.turnarounds.map((x) => x.imported.airline))].filter((code) => !known.has(code)).sort();
  // In the dry run an unknown airline stands for the one the import would make.
  const withNew: AirlineInfo[] = [...airlines, ...newAirlineCodes.map((code) => ({ id: `new:${code}`, code, defaultTemplateId: "new" }))];
  const window = { start: localDayRange(addDays(range.start, -MARGIN_DAYS)).start, end: localDayRange(addDays(range.end, MARGIN_DAYS)).end };
  const existing = await loadExistingFlights(window, { ikarus: true });
  const diff = diffImport({
    plan: { turnarounds: plan.turnarounds.map((x) => x.imported) },
    existing,
    airlines: withNew,
    profileId: await ikarusProfileId(null),
    // The backup is a rolling window, not a schedule: nothing is marked missing.
    period: null,
  });
  const flightIds = diff.entries.flatMap((e) => (e.kind === "changed" || e.kind === "unchanged" ? [e.flightId] : []));
  return { turnarounds: plan.turnarounds, diff, live: await loadLiveStates(flightIds), newAirlineCodes };
}

/** For the save: the Ikarus fields per turnaround; on an unchanged flight only when something differs. */
function extraFor(prepared: Prepared) {
  const ikarusOf = new Map(prepared.turnarounds.map((x) => [x.imported, x.ikarus]));
  const changed = new Set(prepared.diff.entries.flatMap((e) => (e.kind === "changed" ? [e.flightId] : [])));
  return (turnaround: ImportedTurnaround, flightId: string | null) => {
    const ikarus = ikarusOf.get(turnaround)!;
    const current = flightId ? (prepared.live.get(flightId) ?? null) : null;
    const data = liveData(ikarus, current);
    if (!flightId || changed.has(flightId)) return data;
    return current && liveChanges(data, current).length > 0 ? data : null;
  };
}

function counts(prepared: Prepared) {
  const { entries } = prepared.diff;
  const count = (kind: string) => entries.filter((e) => e.kind === kind).length;
  const extra = extraFor(prepared);
  const conflicts = entries.flatMap((e) => (e.kind === "conflict" ? [e.reason] : []));
  return {
    new: count("new"),
    changed: count("changed"),
    live: entries.filter((e) => e.kind === "unchanged" && extra(e.turnaround, e.flightId) !== null).length,
    unchanged: entries.filter((e) => e.kind === "unchanged" && extra(e.turnaround, e.flightId) === null).length,
    repaired: entries.filter((e) => e.kind === "changed" && e.repair).length,
    merged: entries.filter((e) => e.kind === "changed" && !!e.merges).length,
    conflicts: conflicts.length,
    operational: conflicts.filter((r) => r === "operational").length,
    merge: conflicts.filter((r) => r === "merge").length,
    lostLeg: conflicts.filter((r) => r === "lostLeg").length,
    errors: count("error"),
  };
}

async function importBackup() {
  const dir = option("dir");
  if (!dir) throw new Error(t.usage);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) throw new Error(fmt(t.noDir, { dir }));
  const from = day("from");
  const to = day("to");
  if (from && to && from > to) throw new Error(t.badRange);
  const apply = process.argv.includes("--apply");

  const window =
    from && to ? { start: localDayRange(addDays(from, -MARGIN_DAYS)).start, end: localDayRange(addDays(to, MARGIN_DAYS)).end } : undefined;
  const read = readSnapshotDir(dir, window);
  if (read.snapshots.length === 0) throw new Error(t.noSnapshots);
  const times = read.snapshots.map((s) => +s.takenAt);
  const range = { start: from ?? toLocalDate(new Date(Math.min(...times))), end: to ?? toLocalDate(new Date(Math.max(...times))) };

  const merged = mergeSnapshots(read.snapshots);
  const plan = planIkarus(merged.legs, range);
  let prepared = await prepare(plan, range);

  const kinds = { TURNAROUND: 0, ARRIVAL_ONLY: 0, DEPARTURE_ONLY: 0 };
  for (const x of plan.turnarounds) kinds[x.imported.kind]++;
  const arrivals = kinds.TURNAROUND + kinds.ARRIVAL_ONLY;
  const errors = errorCounts(merged.errors);

  let runId: string | null = null;
  let newAirlines = prepared.newAirlineCodes.length;
  if (apply) {
    const user = await defaultImportUser(option("user"));
    if (!user) throw new Error(option("user") ? fmt(t.noUser, { username: option("user")! }) : t.noAdmin);
    newAirlines = await createIkarusAirlines(prepared.newAirlineCodes);
    const profileId = await ikarusProfileId(user.id);
    // Again with the airlines made and the profile there.
    prepared = await prepare(plan, range);
    const c = counts(prepared);
    const summary: ImportSummary & Record<string, number> = {
      new: c.new,
      changed: c.changed + c.live,
      repaired: c.repaired,
      merged: c.merged,
      unchanged: c.unchanged,
      conflicts: c.conflicts,
      errors: c.errors,
      unpaired: kinds.ARRIVAL_ONLY + kinds.DEPARTURE_ONLY,
      missing: 0,
      filteredRows: 0,
      totalRows: merged.legs.length,
      snapshots: read.snapshots.length,
    };
    runId = await applyImport({
      userId: user.id,
      diff: prepared.diff,
      profileId,
      fileName: fmt(t.importFile, { count: read.snapshots.length }),
      fileSize: read.bytes,
      period: range,
      summary,
      extra: extraFor(prepared),
    });
  }

  const c = counts(prepared);
  const lines = [
    runId ? fmt(t.appliedTitle, { run: runId }) : t.dryRunTitle,
    fmt(t.period, range),
    fmt(t.snapshots, { count: read.snapshots.length, unreadable: read.unreadable.length }),
    fmt(t.records, { occurrences: merged.occurrences, legs: merged.legs.length, duplicates: plan.duplicates }),
    ...(merged.errors.length > 0
      ? [fmt(t.recordErrors, { list: Object.entries(errors).map(([k, n]) => `${t.recordErrorNames[k as RecordError]}: ${n}`).join(", ") })]
      : []),
    fmt(t.turnarounds, {
      total: plan.turnarounds.length,
      paired: kinds.TURNAROUND,
      arrivalOnly: kinds.ARRIVAL_ONLY,
      departureOnly: kinds.DEPARTURE_ONLY,
      rate: arrivals === 0 ? 0 : Math.round((kinds.TURNAROUND / arrivals) * 100),
    }),
    fmt(t.unpaired, plan.unpaired),
    fmt(t.flights, c),
    fmt(t.conflicts, { total: c.conflicts, operational: c.operational, merge: c.merge, lostLeg: c.lostLeg }),
    fmt(t.errors, { total: c.errors }),
    fmt(t.newAirlines, { count: newAirlines }),
    ...(runId ? [] : [t.applyHint]),
  ];
  console.log(lines.join("\n"));
}

async function remove() {
  const result = await removeIkarusData();
  if (!result.ok) throw new Error(fmt(t.removeBlocked, { count: result.practicalExams }));
  console.log(fmt(t.removed, { flights: result.flights, airlines: result.airlines, messages: result.messages }));
}

async function main() {
  if (isProduction(process.env)) throw new Error(t.refusedInProduction);
  if (process.argv[2] === "remove") return remove();
  return importBackup();
}

main()
  .catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
