"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import { abortProcess, releaseProcess, startProcess } from "@/lib/data/processes";
import { messages } from "@/lib/messages";
import { canManageTraining, canRelease } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { toLocalDate } from "@/lib/time";

// Starting and aborting a training process with "Képzések kezelése", and its
// release with "Kibocsátás" (CLAUDE.md, 10. mérföldkő).

const p = messages.processes;

export async function startProcessAction(_previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!actor || !canManageTraining(actor)) return { ok: false, error: messages.errors.forbidden };
  const started = await startProcess(String(formData.get("userId") ?? ""), String(formData.get("trainingId") ?? ""), actor.id);
  if ("problem" in started) return { ok: false, error: p.startProblems[started.problem] };
  redirect(`/training/processes/${started.id}`);
}

/** Releases a ready process: the passed record is made (10. mérföldkő, "Kibocsátás"). */
export async function releaseProcessAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actionUser(canRelease);
    const released = await releaseProcess(id, actor.id, toLocalDate(new Date()));
    if ("problem" in released) throw new ActionError(messages.release.problems[released.problem]);
    refresh();
  });
}

export async function abortProcessAction(id: string, _previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actionUser(canManageTraining);
    const reason = String(formData.get("reason") ?? "").trim();
    if (reason.length > 500) throw new ActionError(p.errors.reason);
    if (!(await abortProcess(id, actor.id, reason || null))) throw new ActionError(p.abortFailed);
    refresh();
  });
}
