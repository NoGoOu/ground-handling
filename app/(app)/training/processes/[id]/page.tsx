import Link from "next/link";
import { notFound } from "next/navigation";
import { OjtMetricsView, Suitability } from "@/components/ojt-metrics";
import { ProcessSummary } from "@/components/process-summary";
import { listProcessAttempts } from "@/lib/data/attempts";
import { examinerProblem } from "@/lib/data/exam-access";
import { listProcessSessions } from "@/lib/data/ojt";
import { activeCriteria, listExamineeTaskParts, listProcessPracticalExams, readResults } from "@/lib/data/practical";
import { PRACTICAL_EXAM_LOOKBACK_DAYS } from "@/lib/exams/defaults";
import { getProcess, listTrainingSheets, ojtRequirementOf } from "@/lib/data/processes";
import { readMetrics } from "@/lib/exams/ojt";
import { failedKnockOuts } from "@/lib/exams/practical";
import { flightLabel } from "@/lib/flight";
import { attemptState, formatPoints, percentOf } from "@/lib/exams/scoring";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canExamine, canManageTraining, canOpenExamAttempt, canRelease, canSeeInternalNotes, canViewProcessOf } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { formatDateTime, toLocalDate } from "@/lib/time";
import { openAttemptAction } from "../../attempts/actions";
import { OpenAttemptForm } from "../../attempts/forms";
import { abortProcessAction, releaseProcessAction } from "../actions";
import { AbortProcessForm, ReleaseButton } from "../forms";
import { recordPracticalExamAction } from "../practical-actions";
import { PracticalExamForm } from "../practical-form";

// One training process (CLAUDE.md, 10. mérföldkő, "Képzési folyamat"): where
// it stands, and each prescribed part with its attempts, practices and exams.

const p = messages.processes;
const a = messages.attempts;

export default async function ProcessPage(props: PageProps<"/training/processes/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  const process = await getProcess(id);
  if (!process || !canViewProcessOf(user, process.userId)) notFound();
  const now = new Date();
  const running = process.status === "IN_PROGRESS";
  const attempts = process.training.theoryPart ? await listProcessAttempts(process.id, now) : [];
  const open = attempts.some((attempt) => !attempt.submittedAt);
  const canOpen = canOpenExamAttempt(user) && running && process.training.theoryPart;
  const sheets = canOpen && !open ? await listTrainingSheets(process.trainingId) : [];
  const details = canSeeInternalNotes(user) || canOpenExamAttempt(user);
  const sessions = process.training.practicalPart ? await listProcessSessions(process.id) : [];
  const requirement = ojtRequirementOf(process.training);
  const practicalExams = process.training.practicalPart ? await listProcessPracticalExams(process.id) : [];
  // The examiner records it; whether the qualification is valid is checked for the day of the chosen task.
  const examining = running && process.training.practicalPart && canExamine(user);
  const [taskParts, criteria, examinerToday] = examining
    ? await Promise.all([
        listExamineeTaskParts(process.userId),
        activeCriteria(process.trainingId),
        examinerProblem(user, process.training.qualification),
      ])
    : [[], [], null];
  const x = messages.practical;

  return (
    <div className="flex flex-col gap-4">
      <Link href="/training/processes" className="self-start text-sm text-sky-700 hover:underline">
        {p.title}
      </Link>
      <h1 className="text-2xl font-bold">
        {process.user.name} · {process.training.name}
      </h1>
      <section className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-sm">
        <ProcessSummary process={process} />
        <p className="text-neutral-600">{fmt(p.startedBy, { name: process.startedBy.name, time: formatDateTime(process.startedAt) })}</p>
        {process.abortedBy && process.abortedAt && (
          <p className="text-neutral-600">
            {fmt(p.abortedBy, { name: process.abortedBy.name, time: formatDateTime(process.abortedAt) })}
            {process.abortReason && <> · {fmt(p.reason, { reason: process.abortReason })}</>}
          </p>
        )}
        {process.releasedBy && process.releasedAt && (
          <p className="text-neutral-600">{fmt(p.releasedBy, { name: process.releasedBy.name, time: formatDateTime(process.releasedAt) })}</p>
        )}
      </section>

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
                    {details ? (
                      <Link href={`/training/attempts/${attempt.id}`} className="text-sky-700 hover:underline">
                        {a.details}
                      </Link>
                    ) : (
                      user.id === process.userId && (
                        <Link href={`/training/exam/${attempt.id}`} className="text-sky-700 hover:underline">
                          {state === "OPEN" || state === "NOT_STARTED" ? a.fill : a.details}
                        </Link>
                      )
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

      {process.training.practicalPart && (
        <>
          <section className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-sm">
            <h2 className="font-semibold">{p.ojtTitle}</h2>
            <p>
              {fmt(p.ojtProgress, { suitable: process.ojt.suitable, required: process.ojt.required })}
              {process.ojt.waiting > 0 && <> · {fmt(p.ojtWaiting, { n: process.ojt.waiting })}</>}
            </p>
            <p className="text-xs text-neutral-500">
              {fmt(messages.ojt.thresholds, { completeness: requirement.minCompletenessPercent, onTime: requirement.minOnTimePercent })}
            </p>
            {sessions.length === 0 ? (
              <p className="text-neutral-600">{p.noOjt}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-neutral-100">
                {sessions.map((session) => {
                  const metrics = readMetrics(session.metrics);
                  const day = session.task.flight.sta ?? session.task.flight.std;
                  return (
                    <li key={session.id} className="flex flex-col gap-1 py-2">
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <Link href={`/tasks/${session.task.id}`} className="font-medium text-sky-700 hover:underline">
                          {fmt(messages.ojt.sessionRow, {
                            flight: `${flightLabel(session.task.flight)} ${session.task.taskType.code}`,
                            part: messages.part[session.part],
                            date: day ? toLocalDate(day) : "–",
                          })}
                        </Link>
                        <span>
                          {session.verdict ? messages.ojt.verdicts[session.verdict] : messages.ojt.waiting}
                          {session.mentor && <> · {fmt(messages.ojt.mentor, { name: session.mentor.name })}</>}
                        </span>
                      </span>
                      {session.comment && <span className="text-neutral-600">{session.comment}</span>}
                      {metrics && <OjtMetricsView metrics={metrics} />}
                      <Suitability session={{ verdict: session.verdict, metrics }} requirement={requirement} />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <section className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-sm">
            <h2 className="font-semibold">{p.practicalTitle}</h2>
            {practicalExams.length === 0 ? (
              <p className="text-neutral-600">{p.noPractical}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-neutral-100">
                {practicalExams.map((exam) => {
                  const day = exam.task.flight.sta ?? exam.task.flight.std;
                  return (
                    <li key={exam.id} className="flex flex-col gap-1 py-2">
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <Link href={`/tasks/${exam.task.id}`} className="font-medium text-sky-700 hover:underline">
                          {fmt(x.row, {
                            date: day ? toLocalDate(day) : "–",
                            flight: flightLabel(exam.task.flight),
                            type: exam.task.taskType.code,
                            part: messages.part[exam.part],
                          })}
                        </Link>
                        <span className={`font-semibold ${exam.verdict === "PASS" ? "text-emerald-700" : "text-red-700"}`}>{x.verdicts[exam.verdict]}</span>
                      </span>
                      {failedKnockOuts(readResults(exam.results)).length > 0 && (
                        <span className="font-medium text-red-700">{x.forcedFailShort}</span>
                      )}
                      <span className="text-neutral-600">{fmt(x.examiner, { name: exam.examiner.name })} · {formatDateTime(exam.createdAt)}</span>
                      <ul className="flex flex-col gap-0.5">
                        {readResults(exam.results).map((result) => (
                          <li key={result.criterionId}>
                            <span className={result.verdict === "PASS" ? "text-emerald-700" : "text-red-700"}>{x.criterionVerdicts[result.verdict]}</span>
                            {" · "}
                            {result.text}
                            {result.knockOut && <span className="ml-1 rounded bg-red-100 px-1 text-xs font-semibold text-red-800">{x.knockOutTag}</span>}
                            {result.note && <span className="text-neutral-600"> – {result.note}</span>}
                          </li>
                        ))}
                      </ul>
                      {exam.feedback && (
                        <span>
                          <span className="text-neutral-500">{x.feedback}: </span>
                          {exam.feedback}
                        </span>
                      )}
                      {canSeeInternalNotes(user) && exam.internalNote && (
                        <span>
                          <span className="text-neutral-500">{x.internalNote}: </span>
                          {exam.internalNote}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {examining && (
              <div className="flex flex-col gap-2 border-t border-neutral-100 pt-3">
                <h3 className="font-semibold">{x.formTitle}</h3>
                <p className="max-w-3xl text-neutral-600">{fmt(x.hint, { days: PRACTICAL_EXAM_LOOKBACK_DAYS })}</p>
                {!process.ojt.met && (
                  <p className="text-orange-700">⚠ {fmt(x.ojtNotMet, { suitable: process.ojt.suitable, required: process.ojt.required })}</p>
                )}
                {examinerToday && <p className="text-orange-700">⚠ {messages.attempts.notEligible[examinerToday]}</p>}
                {taskParts.length === 0 ? (
                  <p className="text-neutral-600">{fmt(x.noTaskParts, { days: PRACTICAL_EXAM_LOOKBACK_DAYS })}</p>
                ) : (
                  <PracticalExamForm
                    action={recordPracticalExamAction.bind(null, process.id)}
                    taskParts={taskParts.map(({ task, part, day, role }) => ({
                      value: `${task.id}|${part}`,
                      label: fmt(x.option, {
                        day,
                        flight: flightLabel(task.flight),
                        type: task.taskType.code,
                        part: messages.part[part],
                        role: x.roles[role],
                      }),
                    }))}
                    criteria={criteria.map((criterion) => ({ id: criterion.id, text: criterion.text, knockOut: criterion.knockOut }))}
                  />
                )}
              </div>
            )}
          </section>
        </>
      )}

      {process.state === "READY" && canRelease(user) && (
        <section className="flex flex-col gap-2 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <h2 className="font-semibold text-amber-900">{messages.release.title}</h2>
          <p className="max-w-3xl text-sm text-amber-900">{messages.release.readyHint}</p>
          <ReleaseButton action={releaseProcessAction.bind(null, process.id)} />
        </section>
      )}
      {process.recordId && canManageTraining(user) && (
        <Link href={`/training/records/${process.recordId}`} className="self-start text-sm text-sky-700 hover:underline">
          {messages.release.record}
        </Link>
      )}

      {running && canManageTraining(user) && (
        <section className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="font-semibold">{p.abortTitle}</h2>
          <p className="max-w-3xl text-sm text-neutral-600">{p.abortHint}</p>
          <AbortProcessForm action={abortProcessAction.bind(null, process.id)} />
        </section>
      )}
    </div>
  );
}
