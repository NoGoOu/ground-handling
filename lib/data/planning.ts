import type { Prisma } from "@/generated/prisma/client";
import { listPublicationsInRange } from "@/lib/data/publications";
import { listRosterAgents } from "@/lib/data/shifts";
import { listTaskViewsForDay, type TaskView } from "@/lib/data/tasks";
import { prisma } from "@/lib/db";
import { flightLabel } from "@/lib/flight";
import { messages } from "@/lib/messages";
import { planDay } from "@/lib/planning/balance";
import { draftConflicts, draftPlan, type DraftConflict } from "@/lib/planning/draft";
import { windowsOfDay, type PlanWindow } from "@/lib/planning/input";
import {
  DEFAULT_PLANNING_SETTINGS,
  pickSettings,
  settingsFromJson,
  type PlanningSettings,
} from "@/lib/planning/settings";
import { itemWindow, planDayView, type PlanDayView } from "@/lib/planning/view";
import { SETTINGS_ID } from "@/lib/settings";
import { addDays, localDayRange } from "@/lib/time";

// Data side of the planner view (4. mérföldkő). The calculations are pure
// (lib/planning); this file only loads and saves.

/** Every Budapest day from start to end, both included. */
export function daysOf(start: string, end: string): string[] {
  const days: string[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day);
  return days;
}

/**
 * The tasks whose windows may start in the period. A window starts before its
 * anchor, so a task shows on the list of the window's day or the day after;
 * the lists of the period and the following day hold every one of them.
 */
export async function listPlanningTasks(start: string, end: string): Promise<TaskView[]> {
  const byId = new Map<string, TaskView>();
  for (const day of daysOf(start, addDays(end, 1))) {
    for (const task of await listTaskViewsForDay(day)) byId.set(task.id, task);
  }
  return [...byId.values()];
}

/** The input of each day of the period (CLAUDE.md, "Folyamat" 2). */
export function windowsByDay(tasks: readonly TaskView[], days: readonly string[]): Map<string, PlanWindow[]> {
  const planning = tasks.map((task) => ({ id: task.id, windows: task.timeline.shape.windows }));
  return new Map(days.map((day) => [day, windowsOfDay(planning, day)]));
}

/** The global planning settings, and the segment type the draft shifts get. */
export async function getPlanningSettings(): Promise<{ settings: PlanningSettings; segmentTypeId: string | null }> {
  const row = await prisma.planningSetting.findUnique({ where: { id: SETTINGS_ID } });
  return row
    ? { settings: pickSettings(row), segmentTypeId: row.segmentTypeId }
    : { settings: DEFAULT_PLANNING_SETTINGS, segmentTypeId: null };
}

/** Segment types a saved shift may get: active and operative. */
export async function listShiftSegmentTypes() {
  return prisma.segmentType.findMany({
    where: { active: true, operative: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

const dateValue = (day: string) => new Date(`${day}T00:00:00Z`);
const dayText = (date: Date) => date.toISOString().slice(0, 10);

/** Plans, newest first. */
export async function listPlans() {
  const plans = await prisma.plan.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      createdBy: { select: { name: true } },
      _count: { select: { days: true } },
    },
  });
  return plans.map((plan) => ({ ...plan, start: dayText(plan.startDate), end: dayText(plan.endDate) }));
}

export async function getPlan(id: string) {
  const plan = await prisma.plan.findUnique({
    where: { id },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      createdBy: { select: { name: true } },
      days: { select: { date: true }, orderBy: { date: "asc" } },
    },
  });
  return plan && { ...plan, start: dayText(plan.startDate), end: dayText(plan.endDate), days: plan.days.map((d) => dayText(d.date)) };
}

/**
 * Calculates the given days of a plan with today's settings and windows. A
 * day's positions, names and manual moves are replaced; the day itself stays,
 * so the draft shifts saved from it remain linked (the next save replaces them).
 */
export async function calculatePlanDays(planId: string, days: readonly string[]): Promise<void> {
  if (days.length === 0) return;
  const sorted = [...days].sort();
  const { settings } = await getPlanningSettings();
  const byDay = windowsByDay(await listPlanningTasks(sorted[0], sorted.at(-1)!), sorted);
  const calculatedAt = new Date();
  for (const day of sorted) {
    const positions = planDay(byDay.get(day) ?? [], settings);
    const copy = settings as unknown as Prisma.InputJsonValue;
    await prisma.$transaction(async (tx) => {
      const { id: dayId } = await tx.planDay.upsert({
        where: { planId_date: { planId, date: dateValue(day) } },
        create: { planId, date: dateValue(day), settings: copy, calculatedAt },
        update: { settings: copy, calculatedAt },
        select: { id: true },
      });
      await tx.planPosition.deleteMany({ where: { dayId } });
      for (const [index, windows] of positions.entries()) {
        const { id: positionId } = await tx.planPosition.create({
          data: { dayId, number: index + 1 },
          select: { id: true },
        });
        await tx.planItem.createMany({
          data: windows.map((w) => ({ dayId, positionId, taskId: w.taskId, part: w.part, start: w.start, end: w.end })),
        });
      }
    });
  }
}

export async function createPlan(userId: string, start: string, end: string): Promise<string> {
  const plan = await prisma.plan.create({
    data: { startDate: dateValue(start), endDate: dateValue(end), createdById: userId },
    select: { id: true },
  });
  await calculatePlanDays(plan.id, daysOf(start, end));
  return plan.id;
}

/** A stored plan day with what its view needs; null when the day is not in the plan. */
export async function getPlanDayView(planId: string, day: string): Promise<(PlanDayView & { dayId: string; calculatedAt: Date; settings: PlanningSettings }) | null> {
  const stored = await prisma.planDay.findUnique({
    where: { planId_date: { planId, date: dateValue(day) } },
    select: {
      id: true,
      settings: true,
      calculatedAt: true,
      positions: { select: { id: true, number: true, userId: true, user: { select: { name: true } } } },
      items: { select: { id: true, positionId: true, taskId: true, part: true, start: true, end: true, manual: true } },
    },
  });
  if (!stored) return null;
  const settings = settingsFromJson(stored.settings);
  const [tasks, labelled] = await Promise.all([
    listPlanningTasks(day, day),
    prisma.task.findMany({
      where: { id: { in: [...new Set(stored.items.map((item) => item.taskId))] } },
      select: { id: true, flight: { select: { inboundFlightNumber: true, outboundFlightNumber: true, stand: true } } },
    }),
  ]);
  const current = windowsByDay(tasks, [day]).get(day) ?? [];
  const labels = new Map(
    labelled.map((task) => [task.id, { flightLabel: flightLabel(task.flight), stand: task.flight.stand ?? messages.flightForm.none }]),
  );
  const view = planDayView({
    positions: stored.positions.map((p) => ({ id: p.id, number: p.number, userId: p.userId, userName: p.user?.name ?? null })),
    items: stored.items,
    settings,
    labels,
    current,
  });
  return { ...view, dayId: stored.id, calculatedAt: stored.calculatedAt, settings };
}

/**
 * Moves a window to another position of its day, or to a new one, by hand
 * (CLAUDE.md, "Folyamat" 4). A position left empty goes. Returns the windows
 * of the target position, to warn about the rules it breaks.
 */
export async function movePlanItem(
  planId: string,
  day: string,
  itemId: string,
  target: string | "new",
): Promise<{ windows: PlanWindow[]; settings: PlanningSettings } | null> {
  return prisma.$transaction(async (tx) => {
    const planDay = await tx.planDay.findUnique({
      where: { planId_date: { planId, date: dateValue(day) } },
      select: { id: true, settings: true, positions: { select: { id: true, number: true } } },
    });
    const item = planDay && (await tx.planItem.findFirst({ where: { id: itemId, dayId: planDay.id } }));
    if (!planDay || !item) return null;

    let positionId = target;
    if (target === "new") {
      const number = Math.max(0, ...planDay.positions.map((p) => p.number)) + 1;
      positionId = (await tx.planPosition.create({ data: { dayId: planDay.id, number }, select: { id: true } })).id;
    } else if (!planDay.positions.some((p) => p.id === target)) {
      return null;
    }
    if (positionId !== item.positionId) {
      await tx.planItem.update({ where: { id: item.id }, data: { positionId, manual: true } });
      const left = await tx.planItem.count({ where: { positionId: item.positionId } });
      if (left === 0) await tx.planPosition.delete({ where: { id: item.positionId } });
    }
    const items = await tx.planItem.findMany({ where: { positionId } });
    return { windows: items.map(itemWindow), settings: settingsFromJson(planDay.settings) };
  });
}

/** The agents a position may be named for: active members of a team. */
export async function listPositionAgents() {
  return listRosterAgents(null);
}

/** Names the positions of a plan day; an empty value clears the name. Unknown agents are refused. */
export async function setPositionNames(planId: string, day: string, names: ReadonlyMap<string, string | null>) {
  const planDay = await prisma.planDay.findUnique({
    where: { planId_date: { planId, date: dateValue(day) } },
    select: { positions: { select: { id: true } } },
  });
  if (!planDay) return false;
  const known = new Set(planDay.positions.map((p) => p.id));
  const userIds = [...new Set([...names.values()].filter((id): id is string => !!id))];
  const agents = await listRosterAgents(userIds);
  if (agents.length !== userIds.length || [...names.keys()].some((id) => !known.has(id))) return false;
  await prisma.$transaction(
    [...names].map(([id, userId]) => prisma.planPosition.update({ where: { id }, data: { userId } })),
  );
  return true;
}

export type DraftSaveResult =
  | { ok: true; saved: number; publishedDays: string[]; unnamed: number }
  | { ok: false; reason: "noSegmentType" }
  | { ok: false; reason: "conflicts"; conflicts: DraftConflict[] };

/**
 * "Mentés a tervezetbe" for the whole plan: every named position becomes a
 * draft shift of one segment. Published days are skipped; the other days'
 * earlier draft shifts from this plan are replaced. Nothing is written while
 * any new shift overlaps a draft shift of the same agent.
 */
export async function saveDraftShifts(planId: string, note: (day: string, number: number) => string): Promise<DraftSaveResult | null> {
  const plan = await getPlan(planId);
  if (!plan) return null;
  const [days, publications, { segmentTypeId }] = await Promise.all([
    prisma.planDay.findMany({
      where: { planId },
      select: {
        id: true,
        date: true,
        settings: true,
        positions: {
          select: {
            number: true,
            userId: true,
            user: { select: { name: true } },
            items: { select: { id: true, positionId: true, taskId: true, part: true, start: true, end: true, manual: true } },
          },
        },
      },
    }),
    listPublicationsInRange(plan.start, plan.end),
    getPlanningSettings(),
  ]);
  const type = segmentTypeId
    ? await prisma.segmentType.findFirst({ where: { id: segmentTypeId, active: true, operative: true }, select: { id: true } })
    : null;
  if (!type) return { ok: false, reason: "noSegmentType" };

  const positions = days.flatMap((d) =>
    d.positions.map((p) => ({
      dayId: d.id,
      day: dayText(d.date),
      number: p.number,
      userId: p.userId,
      userName: p.user?.name ?? null,
      windows: p.items.map(itemWindow),
      settings: settingsFromJson(d.settings),
    })),
  );
  const draft = draftPlan(positions, plan.days, publications);
  const replaced = days.filter((d) => draft.savedDays.includes(dayText(d.date))).map((d) => d.id);

  // The agents' other draft shifts around the period; the ones this save replaces do not count.
  const around = { start: localDayRange(addDays(plan.start, -1)).start, end: localDayRange(addDays(plan.end, 2)).end };
  const others = await prisma.shift.findMany({
    where: {
      layer: "DRAFT",
      userId: { in: [...new Set(draft.shifts.map((s) => s.userId))] },
      OR: [{ planDayId: null }, { planDayId: { notIn: replaced } }],
      segments: { some: { start: { lt: around.end }, end: { gt: around.start } } },
    },
    select: { userId: true, segments: { select: { start: true, end: true } } },
  });
  const spans = others.flatMap((shift) =>
    shift.segments.length
      ? [
          {
            userId: shift.userId,
            start: new Date(Math.min(...shift.segments.map((s) => s.start.getTime()))),
            end: new Date(Math.max(...shift.segments.map((s) => s.end.getTime()))),
          },
        ]
      : [],
  );
  const conflicts = draftConflicts(draft.shifts, spans);
  if (conflicts.length > 0) return { ok: false, reason: "conflicts", conflicts };

  await prisma.$transaction(async (tx) => {
    await tx.shift.deleteMany({ where: { layer: "DRAFT", planDayId: { in: replaced } } });
    for (const shift of draft.shifts) {
      await tx.shift.create({
        data: {
          userId: shift.userId,
          layer: "DRAFT",
          note: note(shift.day, shift.number),
          planDayId: shift.dayId,
          segments: { create: [{ start: shift.start, end: shift.end, segmentTypeId: type.id }] },
        },
      });
    }
  });
  return { ok: true, saved: draft.shifts.length, publishedDays: draft.publishedDays, unnamed: draft.unnamed.length };
}
