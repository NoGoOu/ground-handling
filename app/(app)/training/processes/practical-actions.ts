"use server";

import { refresh } from "next/cache";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import { examinerProblem } from "@/lib/data/exam-access";
import { practiceDay } from "@/lib/data/ojt";
import { activeCriteria, examineeRole, recordPracticalExam, type CriterionResult } from "@/lib/data/practical";
import { getProcess } from "@/lib/data/processes";
import { getTaskView } from "@/lib/data/tasks";
import { PRACTICAL_EXAM_LOOKBACK_DAYS } from "@/lib/exams/defaults";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { addDays, toLocalDate } from "@/lib/time";

// The practical exam (CLAUDE.md, 10. mérföldkő, "Gyakorlati vizsga"): the
// examiner judges a task part the examinee worked, per criterion. It warns,
// but allows, when the OJT requirement is not met yet.

const x = messages.practical;
const a = messages.attempts;

function text(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  if (value.length > 2000) throw new ActionError(x.errors.text);
  return value || null;
}

const isVerdict = (value: unknown): value is "PASS" | "FAIL" => value === "PASS" || value === "FAIL";

export async function recordPracticalExamAction(processId: string, _previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actionUser();
    const process = await getProcess(processId);
    if (!process) throw new ActionError(messages.errors.notFound);
    if (process.status !== "IN_PROGRESS" || !process.training.practicalPart) throw new ActionError(x.errors.process);

    // "taskId|PART": a part the examinee worked as its agent or trainee, in the last days.
    const [taskId, part] = String(formData.get("taskPart") ?? "").split("|");
    if (part !== "ARRIVAL_PART" && part !== "DEPARTURE_PART") throw new ActionError(x.errors.taskPart);
    const task = await getTaskView(taskId);
    const today = toLocalDate(new Date());
    const day = task ? practiceDay(task, part) : null;
    if (!task || !day || !examineeRole(task, part, process.userId) || day < addDays(today, -PRACTICAL_EXAM_LOOKBACK_DAYS) || day > today) {
      throw new ActionError(x.errors.taskPart);
    }

    // Judging: the examining permission and the qualification valid on the day of the exam.
    const problem = await examinerProblem(actor, process.training.qualification, day);
    if (problem) throw new ActionError(a.notEligible[problem]);

    const results: CriterionResult[] = [];
    for (const criterion of await activeCriteria(process.trainingId)) {
      const verdict = formData.get(`criterion_${criterion.id}`);
      if (!isVerdict(verdict)) throw new ActionError(x.errors.criterion);
      results.push({ criterionId: criterion.id, text: criterion.text, verdict, note: text(formData, `note_${criterion.id}`) });
    }
    const verdict = formData.get("verdict");
    if (!isVerdict(verdict)) throw new ActionError(x.errors.verdict);

    await recordPracticalExam({
      processId,
      taskId: task.id,
      part,
      examinerId: actor.id,
      results,
      verdict,
      feedback: text(formData, "feedback"),
      internalNote: text(formData, "internalNote"),
    });
    refresh();
    return {
      ok: true,
      warning: process.ojt.met ? undefined : fmt(x.ojtNotMet, { suitable: process.ojt.suitable, required: process.ojt.required }),
    };
  });
}
