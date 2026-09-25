"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import { describeBoxConflicts, getBoardForDay } from "@/lib/data/board";
import {
  applyTakeover,
  calculatePlanDays,
  createPlan,
  getPlan,
  loadTakeover,
  movePlanItem,
  positionRequirements,
  saveDraftShifts,
  setPositionNames,
} from "@/lib/data/planning";
import { listRosterAgents } from "@/lib/data/shifts";
import { describeShortfalls, loadQualificationContext } from "@/lib/data/training";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canAssignTask, canAssignTasks, canAssignToAgent, canPlan } from "@/lib/permissions";
import { violations } from "@/lib/planning/position";
import { shortfalls } from "@/lib/qualifications";
import { takeOver } from "@/lib/planning/takeover";
import { getCurrentUser } from "@/lib/session";
import { formatDateTime } from "@/lib/time";
import { fieldErrors, formValues, type FormState } from "@/lib/validation/form";
import { planPeriodSchema } from "@/lib/validation/planning";

// The planner view (CLAUDE.md, 4. mérföldkő). Calculating, recalculating and
// moving need the "Tervezés" permission; the checks are here, not only in the
// proxy.

const t = messages.planning.plan;

export type PlanFormState = FormState<{ start: string; end: string }>;

export async function createPlanAction(_previous: PlanFormState, formData: FormData): Promise<PlanFormState> {
  const actor = await getCurrentUser();
  if (!actor || !canPlan(actor)) return { message: messages.errors.forbidden };

  const values = formValues(formData, ["start", "end"] as const);
  const parsed = planPeriodSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const planId = await createPlan(actor.id, parsed.data.start, parsed.data.end);
  redirect(`/planning/${planId}?day=${parsed.data.start}`);
}

export async function recalculateDay(planId: string, day: string): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canPlan);
    const plan = await getPlan(planId);
    if (!plan || !plan.days.includes(day)) throw new ActionError(messages.errors.notFound);
    await calculatePlanDays(planId, [day]);
    refresh();
  });
}

export async function recalculatePlan(planId: string): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canPlan);
    const plan = await getPlan(planId);
    if (!plan) throw new ActionError(messages.errors.notFound);
    await calculatePlanDays(planId, plan.days);
    refresh();
  });
}

/** A box dropped on a lane: breaking a rule only warns (CLAUDE.md, "Folyamat" 4). */
export async function moveItem(
  planId: string,
  day: string,
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canPlan);
    const itemId = formData.get("itemId");
    const target = formData.get("positionId");
    if (typeof itemId !== "string" || typeof target !== "string" || target === "") {
      throw new ActionError(messages.errors.invalidInput);
    }
    const moved = await movePlanItem(planId, day, itemId, target);
    if (!moved) throw new ActionError(messages.errors.notFound);
    refresh();
    const broken = violations(moved.windows, moved.settings);
    return {
      ok: true,
      warning: broken.length ? fmt(t.movedWarning, { rules: broken.map((v) => t.violations[v]).join(", ") }) : undefined,
    };
  });
}

/** The names of a plan day's positions: one select per position ("agent:<positionId>"). */
export async function savePositionNames(
  planId: string,
  day: string,
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canPlan);
    const names = new Map<string, string | null>();
    for (const [key, value] of formData.entries()) {
      if (!key.startsWith("agent:") || typeof value !== "string") continue;
      names.set(key.slice("agent:".length), value || null);
    }
    if (!(await setPositionNames(planId, day, names))) throw new ActionError(messages.planning.names.invalid);
    refresh();

    // A named agent without a qualification the position needs: a warning (6. mérföldkő).
    const agentIds = [...names.values()].filter((id): id is string => !!id);
    if (agentIds.length === 0) return;
    const context = await loadQualificationContext(agentIds);
    const lines = (await positionRequirements(planId, day, context)).flatMap((position) => {
      if (!position.userId) return [];
      const missing = shortfalls(position.required, context.recordsOf(position.userId), day);
      return missing.length > 0
        ? [
            fmt(messages.planning.names.qualificationWarning, {
              number: position.number,
              name: position.userName ?? "?",
              list: describeShortfalls(missing, context.codeOf),
            }),
          ]
        : [];
    });
    return { ok: true, warning: lines.length > 0 ? lines.join(" · ") : undefined };
  });
}

export interface DraftSaveState {
  notice?: string[];
  error?: string;
  conflicts?: string[];
}

/** "Mentés a tervezetbe" for the whole plan (CLAUDE.md, "Nevek és tervezet"). */
export async function saveToDraft(planId: string): Promise<DraftSaveState> {
  const actor = await getCurrentUser();
  if (!actor || !canPlan(actor)) return { error: messages.errors.forbidden };
  const plan = await getPlan(planId);
  if (!plan) return { error: messages.errors.notFound };

  const d = messages.planning.draft;
  const result = await saveDraftShifts(planId, (_day, number) =>
    fmt(d.note, { start: plan.start, end: plan.end, number }),
  );
  if (!result) return { error: messages.errors.notFound };
  if (!result.ok && result.reason === "noSegmentType") return { error: d.noSegmentType };
  if (!result.ok) {
    return {
      error: d.conflicts,
      conflicts: result.conflicts.map((c) =>
        fmt(d.conflict, {
          day: c.day,
          number: c.number,
          name: c.userName,
          start: formatDateTime(c.clash.start),
          end: formatDateTime(c.clash.end),
        }),
      ),
    };
  }
  refresh();
  return {
    notice: [
      fmt(d.saved, { count: result.saved }),
      ...(result.unnamed ? [fmt(d.unnamed, { count: result.unnamed })] : []),
      ...(result.publishedDays.length ? [fmt(d.published, { days: result.publishedDays.join(", ") })] : []),
    ],
  };
}

export interface TakeoverState {
  notice?: string;
  skipped?: string[];
  conflicts?: string[];
  error?: string;
}

/**
 * "Kiosztás átvétele" for one plan day, or for the whole plan with day null
 * (CLAUDE.md, 4. mérföldkő and its follow-up): the plan's agents onto the
 * still unassigned parts, within the actor's scope. Conflicts warn as on the
 * band view, they never block.
 */
export async function takeOverAssignment(planId: string, day: string | null): Promise<TakeoverState> {
  const actor = await getCurrentUser();
  if (!actor || !canAssignTasks(actor)) return { error: messages.errors.forbidden };
  const plan = await getPlan(planId);
  if (!plan || (day !== null && !plan.days.includes(day))) return { error: messages.errors.notFound };
  const days = day === null ? plan.days : [day];
  const input = await loadTakeover(planId, days);

  const t = messages.planning.takeover;
  const result = takeOver(
    input.items,
    input.tasks,
    (task, agentId) => canAssignTask(actor, task) && canAssignToAgent(actor, agentId),
  );
  await applyTakeover(result.updates);
  refresh();

  const names = new Map(
    (await listRosterAgents(null)).map((agent) => [agent.id, agent.name] as const),
  );
  const skipped = [...result.skipped]
    .sort((a, b) => (a.day ?? "").localeCompare(b.day ?? ""))
    .map((s) => {
      const line = fmt(t.skipped, {
        flight: `${s.flightLabel} ${t.parts[s.part]}`,
        reason: fmt(t.reasons[s.reason], { name: (s.agentId && names.get(s.agentId)) || "?" }),
      });
      // A whole plan names the day of each line.
      return day === null && s.day ? fmt(t.onDay, { day: s.day, line }) : line;
    });

  // The usual warnings of the band view, for the tasks just assigned.
  const assignedTasks = new Set(result.assigned.map((a) => a.taskId));
  const conflicts: string[] = [];
  if (assignedTasks.size > 0) {
    for (const boardDay of days) {
      const board = await getBoardForDay(boardDay);
      for (const box of board.lanes.flatMap((lane) => lane.boxes)) {
        if (!assignedTasks.has(box.taskId) || box.conflicts.length === 0) continue;
        const line = fmt(t.conflict, {
          flight: box.flightLabel,
          reasons: describeBoxConflicts(box),
        });
        conflicts.push(day === null ? fmt(t.onDay, { day: boardDay, line }) : line);
      }
    }
  }

  return {
    notice: result.assigned.length ? fmt(t.done, { count: result.assigned.length }) : t.nothing,
    skipped,
    conflicts: [...new Set(conflicts)],
  };
}
