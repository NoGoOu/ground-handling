import Link from "next/link";
import { notFound } from "next/navigation";
import { getAttempt, listProcessAttempts } from "@/lib/data/attempts";
import { examinerProblem } from "@/lib/data/exam-access";
import { attemptState, formatPoints, percentOf } from "@/lib/exams/scoring";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canOpenExamAttempt, canSeeInternalNotes } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { formatDateTime } from "@/lib/time";
import { gradeAnswerAction, saveNotesAction } from "../actions";
import { GradeForm, NotesForm } from "../forms";

// One e-exam attempt for the examiners, the releasers and the coordinator
// (CLAUDE.md, 10. mérföldkő, "Javítás"): the answers next to the right ones,
// the scoring of written answers, the feedback and the internal note, and the
// internal notes of the earlier attempts.

const a = messages.attempts;

export default async function AttemptPage(props: PageProps<"/training/attempts/[id]">) {
  const user = await requireCapability((u) => canOpenExamAttempt(u) || canSeeInternalNotes(u));
  const { id } = await props.params;
  const attempt = await getAttempt(id);
  if (!attempt) notFound();
  const { snapshot, process } = attempt;
  const state = attemptState(attempt, new Date());
  const problem = await examinerProblem(user, process.training.qualification);
  const judge = problem === null;
  const earlier = (await listProcessAttempts(process.id)).filter((other) => other.id !== attempt.id && other.openedAt < attempt.openedAt);

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/training/processes/${process.id}`} className="self-start text-sm text-sky-700 hover:underline">
        {process.training.name}
      </Link>
      <h1 className="text-2xl font-bold">{fmt(a.detailTitle, { name: process.user.name })}</h1>
      <section className="flex flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-4 text-sm">
        <p className="font-medium">{fmt(a.heading, { sheet: snapshot.name, training: process.training.name })}</p>
        <p className="text-neutral-600">{fmt(a.openedBy, { name: attempt.openedBy.name, time: formatDateTime(attempt.openedAt) })}</p>
        {attempt.startedAt && <p className="text-neutral-600">{fmt(a.startedAt, { time: formatDateTime(attempt.startedAt) })}</p>}
        {attempt.submittedAt && <p className="text-neutral-600">{fmt(a.submittedAt, { time: formatDateTime(attempt.submittedAt) })}</p>}
        <p className="font-semibold">{a.states[state]}</p>
        {attempt.passed !== null && (
          <p className={`text-lg font-semibold ${attempt.passed ? "text-emerald-700" : "text-red-700"}`}>
            {fmt(a.result, {
              points: formatPoints(attempt.scoredPoints ?? 0),
              max: attempt.maxPoints,
              percent: percentOf(attempt.scoredPoints ?? 0, attempt.maxPoints),
              verdict: attempt.passed ? a.passed : a.failed,
            })}
          </p>
        )}
        <p className="text-neutral-600">{fmt(a.passMark, { pass: snapshot.passPercent })}</p>
        {attempt.gradedBy && attempt.gradedAt && (
          <p className="text-neutral-600">{fmt(a.gradedBy, { name: attempt.gradedBy.name, time: formatDateTime(attempt.gradedAt) })}</p>
        )}
        {!judge && problem && <p className="text-orange-700">{a.notEligible[problem]}</p>}
      </section>

      <ol className="flex flex-col gap-3">
        {snapshot.questions.map((question, index) => {
          const answer = attempt.answers.find((row) => row.questionIndex === index);
          return (
            <li key={index} className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-sm">
              <span className="text-neutral-500">{fmt(a.question, { n: index + 1, points: question.points })}</span>
              <span className="font-medium whitespace-pre-line">{question.text}</span>
              {question.kind === "TEXT" ? (
                <p className="rounded-lg bg-neutral-50 p-2 whitespace-pre-line">{answer?.text?.trim() || a.noAnswer}</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {question.options.map((option, optionIndex) => {
                    const chosen = answer?.choices.includes(optionIndex) ?? false;
                    return (
                      <li key={optionIndex} className={`flex flex-wrap gap-2 ${option.correct ? "font-semibold text-emerald-800" : ""}`}>
                        <span>{chosen ? "☑" : "☐"}</span>
                        <span>{option.text}</span>
                        {option.correct && <span className="text-xs">({a.right})</span>}
                        {chosen && <span className="text-xs text-sky-800">({a.chosen})</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
              <span className="font-semibold tabular-nums">
                {answer?.points === null || answer?.points === undefined
                  ? a.pending
                  : fmt(a.pointsOf, { points: formatPoints(answer.points), max: question.points })}
                {question.kind !== "TEXT" && answer?.points !== null && answer?.points !== undefined && (
                  <span className="ml-2 text-xs font-normal text-neutral-500">{a.autoScored}</span>
                )}
              </span>
              {answer?.graderNote && <p className="text-neutral-600">{answer.graderNote}</p>}
              {question.kind === "TEXT" && attempt.submittedAt && judge && (
                <GradeForm
                  action={gradeAnswerAction.bind(null, attempt.id, index)}
                  max={question.points}
                  points={answer?.points ?? null}
                  note={answer?.graderNote ?? null}
                />
              )}
            </li>
          );
        })}
      </ol>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{a.notesTitle}</h2>
        {judge ? (
          <NotesForm action={saveNotesAction.bind(null, attempt.id)} feedback={attempt.feedback} internalNote={attempt.internalNote} />
        ) : (
          <>
            {attempt.feedback && (
              <p className="whitespace-pre-line">
                <span className="text-neutral-500">{a.feedback}: </span>
                {attempt.feedback}
              </p>
            )}
            {canSeeInternalNotes(user) && attempt.internalNote && (
              <p className="whitespace-pre-line">
                <span className="text-neutral-500">{a.internalNote}: </span>
                {attempt.internalNote}
              </p>
            )}
          </>
        )}
      </section>

      {canSeeInternalNotes(user) && (
        <section className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-sm">
          <h2 className="font-semibold">{a.earlierNotes}</h2>
          {earlier.filter((other) => other.internalNote).length === 0 ? (
            <p className="text-neutral-600">{a.noEarlierNotes}</p>
          ) : (
            earlier
              .filter((other) => other.internalNote)
              .map((other) => (
                <p key={other.id} className="whitespace-pre-line">
                  <span className="text-neutral-500">
                    {other.snapshot.name}, {formatDateTime(other.openedAt)}:{" "}
                  </span>
                  {other.internalNote}
                </p>
              ))
          )}
        </section>
      )}
    </div>
  );
}
