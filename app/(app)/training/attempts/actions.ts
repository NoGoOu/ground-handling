"use server";

import { refresh } from "next/cache";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import { getAttempt, gradeAnswer, openAttempt, saveAttemptNotes } from "@/lib/data/attempts";
import { examinerProblem } from "@/lib/data/exam-access";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canOpenExamAttempt } from "@/lib/permissions";

// The examiner's actions on e-exams (CLAUDE.md, 10. mérföldkő): opening an
// attempt is organising (an examiner or the coordinator); scoring written
// answers and giving feedback is judging, so it needs the examining permission
// and the training's qualification valid today (approved decision 5).

const a = messages.attempts;

export async function openAttemptAction(processId: string, _previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actionUser(canOpenExamAttempt);
    const sheetId = String(formData.get("sheetId") ?? "");
    const opened = await openAttempt(processId, sheetId, actor.id);
    if ("problem" in opened) throw new ActionError(a.openProblems[opened.problem]);
    refresh();
  });
}

async function judgedAttempt(id: string) {
  const actor = await actionUser();
  const attempt = await getAttempt(id);
  if (!attempt) throw new ActionError(messages.errors.notFound);
  const problem = await examinerProblem(actor, attempt.process.training.qualification);
  if (problem) throw new ActionError(a.notEligible[problem]);
  return { actor, attempt };
}

const text = (formData: FormData, key: string) => {
  const value = String(formData.get(key) ?? "").trim();
  if (value.length > 2000) throw new ActionError(a.errors.notes);
  return value || null;
};

export async function gradeAnswerAction(id: string, questionIndex: number, _previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { actor, attempt } = await judgedAttempt(id);
    const max = attempt.snapshot.questions[questionIndex]?.points ?? 0;
    const raw = String(formData.get("points") ?? "").trim().replace(",", ".");
    const points = Number(raw);
    if (raw === "" || !Number.isFinite(points) || points < 0 || points > max) throw new ActionError(fmt(a.errors.points, { max }));
    if (!(await gradeAnswer(attempt, questionIndex, points, text(formData, "note"), actor.id))) throw new ActionError(a.errors.question);
    refresh();
  });
}

export async function saveNotesAction(id: string, _previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { attempt } = await judgedAttempt(id);
    await saveAttemptNotes(attempt.id, text(formData, "feedback"), text(formData, "internalNote"));
    refresh();
  });
}
