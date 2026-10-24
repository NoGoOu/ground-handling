import "dotenv/config";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { IKARUS_FLIGHTS } from "@/lib/data/ikarus";
import { daysOf, getPlanningSettings, windowsByDay } from "@/lib/data/planning";
import { listTaskViewsForDay, type TaskView } from "@/lib/data/tasks";
import { prisma } from "@/lib/db";
import { readSnapshotDir } from "@/lib/ikarus/read";
import { coverageOf, isCompleteDay, reportCsv, reportText, type ReportDay } from "@/lib/ikarus/report";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { isProduction } from "@/lib/ops/config";
import { metricsOf, planDay } from "@/lib/planning/balance";
import { staffingDay } from "@/lib/staffing/day";
import { demandWindows } from "@/lib/staffing/demand";
import { summaryOf } from "@/lib/staffing/summary";
import { addDays, parseLocalDate, toLocalDate } from "@/lib/time";

// The evaluation of the Ikarus flights in the database (CLAUDE.md,
// "Közbeiktatva: valós járatok az Ikarus-mentésből", "Kiértékelés"):
//   npx tsx scripts/ikarus-report.ts --dir <a mentés mappája> --out <mappa a repón kívül> [--from ÉÉÉÉ-HH-NN] [--to ÉÉÉÉ-HH-NN]
// A CSV per day and a short summary, written outside the repository only.
// The backup folder is read for which days it saw whole.

const t = messages.ikarus;
const REPOSITORY = path.resolve(import.meta.dirname, "..");

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

function isInside(dir: string, root: string): boolean {
  const relative = path.relative(root, dir);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

/** The template parameters as one line: turnaround, travel, after departure, report before departure, break. */
async function templatesInUse(): Promise<{ params: string; tasks: number }[]> {
  const groups = await prisma.task.groupBy({ by: ["templateId"], where: { flight: IKARUS_FLIGHTS }, _count: { _all: true } });
  const templates = await prisma.turnaroundTemplate.findMany({
    where: { id: { in: groups.map((g) => g.templateId) } },
    select: { id: true, minTurnaroundMinutes: true, travelMinutes: true, postDepartureMinutes: true, departureReportMinutes: true, minBreakMinutes: true },
  });
  const byParams = new Map<string, number>();
  for (const group of groups) {
    const p = templates.find((template) => template.id === group.templateId)!;
    const params = [p.minTurnaroundMinutes, p.travelMinutes, p.postDepartureMinutes, p.departureReportMinutes, p.minBreakMinutes].join(" / ");
    byParams.set(params, (byParams.get(params) ?? 0) + group._count._all);
  }
  return [...byParams].map(([params, tasks]) => ({ params, tasks })).sort((a, b) => b.tasks - a.tasks);
}

async function main() {
  if (isProduction(process.env)) throw new Error(t.refusedInProduction);
  const dir = option("dir");
  const out = option("out");
  if (!dir || !out) throw new Error(t.reportUsage);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) throw new Error(fmt(t.noDir, { dir }));
  const outDir = path.resolve(out);
  if (isInside(outDir, REPOSITORY)) throw new Error(t.outInsideRepo);

  const ikarus = new Set((await prisma.flight.findMany({ where: IKARUS_FLIGHTS, select: { id: true } })).map((f) => f.id));
  if (ikarus.size === 0) throw new Error(t.noIkarusFlights);

  const { snapshots } = readSnapshotDir(dir);
  if (snapshots.length === 0) throw new Error(t.noSnapshots);
  const times = snapshots.map((s) => +s.takenAt);
  const lastSnapshot = new Date(Math.max(...times));
  const start = day("from") ?? toLocalDate(new Date(Math.min(...times)));
  const end = day("to") ?? toLocalDate(lastSnapshot);
  if (start > end) throw new Error(t.badRange);
  const coverage = coverageOf(snapshots);

  // The day lists around the period: the planner takes the windows starting
  // on a day (the lists of the day and the next), the demand every window
  // overlapping it (the day before too).
  const lists = new Map<string, TaskView[]>();
  for (const listDay of daysOf(addDays(start, -1), addDays(end, 1))) {
    lists.set(listDay, await listTaskViewsForDay(listDay, (view) => ikarus.has(view.flight.id)));
  }
  const unique = (days: string[]) => [...new Map(days.flatMap((d) => lists.get(d) ?? []).map((task) => [task.id, task])).values()];
  const days = daysOf(start, end);
  const { settings } = await getPlanningSettings();
  const planning = windowsByDay(unique(daysOf(start, addDays(end, 1))), days);
  const demand = demandWindows(
    unique(daysOf(addDays(start, -1), addDays(end, 1))).map((task) => ({ taskType: task.taskType.code, windows: task.timeline.shape.windows })),
  );

  const rows: ReportDay[] = days.map((reportDay) => {
    // The flights of the day's list: one primary task each.
    const flights = (lists.get(reportDay) ?? []).filter((task) => task.isPrimary);
    const type = (task: TaskView) => task.timeline.shape.type;
    const metrics = metricsOf(planDay(planning.get(reportDay) ?? [], settings), settings);
    const peak = summaryOf(staffingDay(reportDay, demand, [], null));
    return {
      day: reportDay,
      complete: isCompleteDay(reportDay, coverage, lastSnapshot),
      flights: flights.length,
      quick: flights.filter((task) => type(task) === "QUICK").length,
      long: flights.filter((task) => type(task) === "LONG").length,
      arrivalOnly: flights.filter((task) => !type(task) && !task.flight.outboundFlightNumber).length,
      departureOnly: flights.filter((task) => !type(task) && !!task.flight.outboundFlightNumber).length,
      positions: metrics.positions,
      workMinutes: metrics.workMinutes,
      peak: peak.peak,
      peakAt: peak.peakAt,
    };
  });

  mkdirSync(outDir, { recursive: true });
  const base = path.join(outDir, `ikarus-riport-${start}_${end}`);
  // With a byte order mark, so a spreadsheet reads the accents as UTF-8.
  writeFileSync(`${base}.csv`, `﻿${reportCsv(rows)}`, "utf8");
  writeFileSync(`${base}.txt`, reportText(rows, { start, end }, { planning: settings, templates: await templatesInUse() }), "utf8");
  console.log(fmt(t.reportWritten, { csv: `${base}.csv`, text: `${base}.txt` }));
}

main()
  .catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
