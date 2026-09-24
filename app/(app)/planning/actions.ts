"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import {
  calculatePlanDays,
  createPlan,
  getPlan,
  movePlanItem,
  saveDraftShifts,
  setPositionNames,
} from "@/lib/data/planning";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canPlan } from "@/lib/permissions";
import { violations } from "@/lib/planning/position";
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
