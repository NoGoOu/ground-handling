import Link from "next/link";
import { notFound } from "next/navigation";
import { listProcessAttempts } from "@/lib/data/attempts";
import { getProcess, listTrainingSheets } from "@/lib/data/processes";
import { attemptState, formatPoints, percentOf } from "@/lib/exams/scoring";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canOpenExamAttempt, canSeeInternalNotes, canViewProcessOf } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { formatDateTime } from "@/lib/time";
import { openAttemptAction } from "../../attempts/actions";
import { OpenAttemptForm } from "../../attempts/forms";

// One training process (CLAUDE.md, 10. mérföldkő, "Képzési folyamat"): its
// parts with their attempts, practices and exams.

const a = messages.attempts;

export default async function ProcessPage(props: PageProps<"/training/processes/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  const process = await getProcess(id);
  if (!process || !canViewProcessOf(user, process.userId)) notFound();
  const now = new Date();
  const attempts = process.training.theoryPart ? await listProcessAttempts(process.id, now) : [];
  const open = attempts.some((attempt) => !attempt.submittedAt);
  const canOpen = canOpenExamAttempt(user) && process.status === "IN_PROGRESS" && process.training.theoryPart;
  const sheets = canOpen && !open ? await listTrainingSheets(process.trainingId) : [];
  const details = canSeeInternalNotes(user) || canOpenExamAttempt(user);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/training" className="self-start text-sm text-sky-700 hover:underline">
        {messages.training.back}
      </Link>
      <h1 className="text-2xl font-bold">
        {process.user.name} · {process.training.name}
      </h1>

      {process.training.theoryPart && (
        <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="font-semibold">{a.theoryTitle}</h2>
          {attempts.length === 0 ? (
            <p className="text-sm text-neutral-600">{a.noAttempts}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-neutral-100 text-sm">
              {attempts.map((attempt) => {
                const state = attemptState(attempt, now);
                return (
                  <li key={attempt.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="flex flex-col">
                      <span>{fmt(a.attemptRow, { sheet: attempt.snapshot.name, time: formatDateTime(attempt.openedAt), state: a.states[state] })}</span>
                      {attempt.passed !== null && (
                        <span className={attempt.passed ? "text-emerald-700" : "text-red-700"}>
                          {fmt(a.result, {
                            points: formatPoints(attempt.scoredPoints ?? 0),
                            max: attempt.maxPoints,
                            percent: percentOf(attempt.scoredPoints ?? 0, attempt.maxPoints),
                            verdict: attempt.passed ? a.passed : a.failed,
                          })}
                        </span>
                      )}
                      {attempt.feedback && (
                        <span className="text-neutral-600">
                          {a.feedback}: {attempt.feedback}
                        </span>
                      )}
                    </span>
                    {details && (
                      <Link href={`/training/attempts/${attempt.id}`} className="text-sky-700 hover:underline">
                        {a.details}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {canOpen &&
            (open ? (
              <p className="text-sm text-neutral-600">{a.alreadyOpen}</p>
            ) : (
              <div className="flex flex-col gap-2 border-t border-neutral-100 pt-3">
                <h3 className="font-semibold">{a.openTitle}</h3>
                <p className="text-sm text-neutral-600">{a.openHint}</p>
                <OpenAttemptForm action={openAttemptAction.bind(null, process.id)} sheets={sheets} />
              </div>
            ))}
        </section>
      )}
    </div>
  );
}
