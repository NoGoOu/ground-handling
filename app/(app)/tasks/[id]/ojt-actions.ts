"use server";

import { refresh } from "next/cache";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import { addTrainee, evaluateSession, removeTrainee } from "@/lib/data/ojt";
import { getTaskView, taskAssignment } from "@/lib/data/tasks";
import { messages } from "@/lib/messages";
import { canAssignTask } from "@/lib/permissions";
import type { Part } from "@/lib/turnaround";

// On the job training on a task (CLAUDE.md, 10. mérföldkő): whoever may assign
// the task adds or removes a trainee; the mentor evaluates the practice.

const o = messages.ojt;

function isPart(value: unknown): value is Part {
  return value === "ARRIVAL_PART" || value === "DEPARTURE_PART";
}

async function loadTask(taskId: string) {
  const task = await getTaskView(taskId);
  if (!task) throw new ActionError(messages.errors.notFound);
  return task;
}

export async function addTraineeAction(taskId: string, part: string, _previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actionUser();
    if (!isPart(part)) throw new ActionError(messages.errors.invalidInput);
    const task = await loadTask(taskId);
    const assignment = taskAssignment(task);
    if (!canAssignTask(actor, assignment)) throw new ActionError(messages.errors.forbidden);
    const problem = await addTrainee(task, assignment, part, String(formData.get("processId") ?? ""), actor.id);
    if (problem) throw new ActionError(o.addProblems[problem]);
    refresh();
  });
}

export async function removeTraineeAction(taskId: string, sessionId: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actionUser();
    const task = await loadTask(taskId);
    if (!canAssignTask(actor, taskAssignment(task))) throw new ActionError(messages.errors.forbidden);
    if (!task.ojt.some((session) => session.id === sessionId)) throw new ActionError(messages.errors.notFound);
    if (!(await removeTrainee(sessionId))) throw new ActionError(o.removeFailed);
    refresh();
  });
}

export async function evaluateAction(taskId: string, sessionId: string, _previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actionUser();
    const task = await loadTask(taskId);
    const session = task.ojt.find((candidate) => candidate.id === sessionId);
    if (!session) throw new ActionError(messages.errors.notFound);
    const verdict = formData.get("verdict");
    if (verdict !== "PASS" && verdict !== "FAIL") throw new ActionError(messages.errors.invalidInput);
    const comment = String(formData.get("comment") ?? "").trim().slice(0, 2000) || null;
    const problem = await evaluateSession(task, taskAssignment(task), session, actor.id, verdict, comment);
    if (problem) throw new ActionError(o.evaluateProblems[problem]);
    refresh();
  });
}
