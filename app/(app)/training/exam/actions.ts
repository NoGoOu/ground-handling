"use server";

import { refresh } from "next/cache";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import { finalize, getAttempt, saveAnswer, startAttempt } from "@/lib/data/attempts";
import { messages } from "@/lib/messages";

// The examinee's actions on their e-exam (CLAUDE.md, 10. mérföldkő,
// "Kitöltés"): only on their own attempt, with their own login.

const a = messages.attempts;

async function ownAttempt(id: string) {
  const actor = await actionUser();
  const attempt = await getAttempt(id);
  // The same answer for someone else's attempt and a missing one.
  if (!attempt || attempt.process.userId !== actor.id) throw new ActionError(messages.errors.notFound);
  return attempt;
}

export async function startAttemptAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const attempt = await ownAttempt(id);
    if (attempt.submittedAt) throw new ActionError(a.errors.closed);
    await startAttempt(id);
    refresh();
  });
}

export async function saveAnswerAction(id: string, questionIndex: number, choices: number[], text: string | null): Promise<ActionResult> {
  return runAction(async () => {
    const attempt = await ownAttempt(id);
    const problem = await saveAnswer(attempt, questionIndex, { choices: Array.isArray(choices) ? choices.map(Number) : [], text });
    if (problem) throw new ActionError(problem === "closed" ? a.errors.closed : a.errors.question);
  });
}

export async function submitAttemptAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const attempt = await ownAttempt(id);
    if (!attempt.startedAt) throw new ActionError(a.errors.closed);
    await finalize(id);
    refresh();
  });
}
