import Link from "next/link";
import { notFound } from "next/navigation";
import { getAttempt } from "@/lib/data/attempts";
import { attemptState, formatPoints, percentOf } from "@/lib/exams/scoring";
import { examineeQuestions } from "@/lib/exams/snapshot";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { requireUser } from "@/lib/session";
import { formatDateTime } from "@/lib/time";
import { saveAnswerAction, startAttemptAction, submitAttemptAction } from "../actions";
import { ExamFill } from "./exam-fill";
import { StartButton } from "./start-button";

// The examinee's own e-exam (CLAUDE.md, 10. mérföldkő, "Kitöltés"), made for
// a phone. Only the examinee opens it. The right answers and the internal
// notes never reach this page: it gets the questions without them.

const a = messages.attempts;

export default async function ExamPage(props: PageProps<"/training/exam/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  const attempt = await getAttempt(id);
  if (!attempt || attempt.process.userId !== user.id) notFound();
  const state = attemptState(attempt, new Date());
  const { snapshot } = attempt;
  const header = (
    <>
      <Link href="/training/me" className="self-start text-sm text-sky-700 hover:underline">
        {messages.training.back}
      </Link>
      <h1 className="text-2xl font-bold">{a.title}</h1>
      <p className="text-neutral-700">{fmt(a.heading, { sheet: snapshot.name, training: attempt.process.training.name })}</p>
    </>
  );

  if (state === "NOT_STARTED") {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
          <p>{a.startIntro}</p>
          <p className="font-medium">
            {snapshot.timeLimitMinutes ? fmt(a.limitIntro, { minutes: snapshot.timeLimitMinutes }) : a.noLimitIntro}
          </p>
          <p className="text-sm text-neutral-600">{fmt(a.passMark, { pass: snapshot.passPercent })}</p>
          <StartButton action={startAttemptAction.bind(null, attempt.id)} />
        </section>
      </div>
    );
  }

  if (state === "OPEN") {
    const saved = snapshot.questions.map((_, index) => {
      const answer = attempt.answers.find((row) => row.questionIndex === index);
      return { choices: answer?.choices ?? [], text: answer?.text ?? "" };
    });
    return (
      <div className="flex flex-col gap-4">
        {header}
        {attempt.deadline && <p className="text-sm text-neutral-600">{fmt(a.deadline, { time: formatDateTime(attempt.deadline) })}</p>}
        <ExamFill
          questions={examineeQuestions(snapshot)}
          saved={saved}
          deadline={attempt.deadline?.getTime() ?? null}
          saveAction={saveAnswerAction.bind(null, attempt.id)}
          submitAction={submitAttemptAction.bind(null, attempt.id)}
        />
      </div>
    );
  }

  // Handed in: the examinee sees their answers, their points and the feedback, never the right answers.
  const shown = examineeQuestions(snapshot);
  return (
    <div className="flex flex-col gap-4">
      {header}
      <section className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4">
        {attempt.submittedAt && <p className="text-sm text-neutral-600">{fmt(a.submittedAt, { time: formatDateTime(attempt.submittedAt) })}</p>}
        {state === "GRADING" ? (
          <p className="font-medium text-sky-900">{a.grading}</p>
        ) : (
          <p className={`text-lg font-semibold ${attempt.passed ? "text-emerald-700" : "text-red-700"}`}>
            {fmt(a.result, {
              points: formatPoints(attempt.scoredPoints ?? 0),
              max: attempt.maxPoints,
              percent: percentOf(attempt.scoredPoints ?? 0, attempt.maxPoints),
              verdict: attempt.passed ? a.passed : a.failed,
            })}
          </p>
        )}
        <p className="text-sm text-neutral-600">{fmt(a.passMark, { pass: snapshot.passPercent })}</p>
        {attempt.feedback && (
          <div className="rounded-lg bg-sky-50 p-3">
            <p className="text-sm font-semibold text-sky-900">{a.feedback}</p>
            <p className="whitespace-pre-line">{attempt.feedback}</p>
          </div>
        )}
      </section>
      <ol className="flex flex-col gap-3">
        {shown.map((question, index) => {
          const answer = attempt.answers.find((row) => row.questionIndex === index);
          const given =
            question.kind === "TEXT"
              ? answer?.text?.trim() || a.noAnswer
              : (answer?.choices ?? []).map((choice) => question.options[choice]).join(", ") || a.noAnswer;
          return (
            <li key={index} className="flex flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-4 text-sm">
              <span className="text-neutral-500">{fmt(a.question, { n: index + 1, points: question.points })}</span>
              <span className="font-medium whitespace-pre-line">{question.text}</span>
              <span>
                <span className="text-neutral-500">{a.yourAnswer}: </span>
                <span className="whitespace-pre-line">{given}</span>
              </span>
              <span className="font-semibold tabular-nums">
                {answer?.points === null || answer?.points === undefined
                  ? a.pending
                  : fmt(a.pointsOf, { points: formatPoints(answer.points), max: question.points })}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
