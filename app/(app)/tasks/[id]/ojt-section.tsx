import Link from "next/link";
import { OjtMetricsView, Suitability } from "@/components/ojt-metrics";
import { listOjtCandidates, mentorProblemOf, practiceDay } from "@/lib/data/ojt";
import { taskAssignment, type TaskView } from "@/lib/data/tasks";
import { ojtMetrics, sessionParts } from "@/lib/exams/ojt";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { agentOfPart, canAssignTask, canViewProcessOf } from "@/lib/permissions";
import type { CurrentUser } from "@/lib/session";
import { formatDateTime } from "@/lib/time";
import { hasPart, isPartCancelled, type Part } from "@/lib/turnaround";
import { addTraineeAction, evaluateAction, removeTraineeAction } from "./ojt-actions";
import { AddTraineeForm, EvaluateForm, RemoveTraineeButton } from "./ojt-forms";

// On the job training on the task (CLAUDE.md, 10. mérföldkő): per part the
// trainee next to the agent, the mentor; adding and removing a trainee for
// whoever may assign the task, the evaluation for the mentor after the task.

const o = messages.ojt;

export async function OjtSection({ task, user }: { task: TaskView; user: CurrentUser }) {
  const assignment = taskAssignment(task);
  const assigner = canAssignTask(user, assignment);
  const quick = task.timeline.shape.type === "QUICK";
  const parts = (["ARRIVAL_PART", "DEPARTURE_PART"] as const).filter((part) => hasPart(task.timeline.kind, part));
  // Nothing to show to whoever neither assigns nor has a practice here.
  if (!assigner && task.ojt.length === 0) return null;
  const candidates = assigner ? await listOjtCandidates() : [];
  const records = [...task.records].map(([milestoneId, record]) => ({ milestoneId, byTrainee: record.byTrainee }));

  const rows = await Promise.all(
    parts.map(async (part: Part) => {
      const session = task.ojt.find((candidate) => candidate.part === part) ?? null;
      const agentId = agentOfPart(assignment, part);
      const mentorName = (part === "ARRIVAL_PART" ? task.arrivalAgent : task.effectiveDepartureAgent)?.name ?? null;
      const covered = session ? sessionParts(part, task.timeline.shape.type) : null;
      const mentorProblem =
        session && covered ? await mentorProblemOf(agentId, session.process.training.qualification, practiceDay(task, part)) : null;
      // On a quick turnaround the arrival trainee works both parts: the departure takes none of its own.
      const canAdd = assigner && !session && !(quick && part === "DEPARTURE_PART") && !isPartCancelled(task.flight, part);
      return { part, session, agentId, mentorName, covered, mentorProblem, canAdd };
    }),
  );
  if (!assigner && rows.every((row) => !row.session)) return null;

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
      <h2 className="font-semibold">{o.title}</h2>
      <p className="max-w-3xl text-sm text-neutral-600">{o.hint}</p>
      {rows.map(({ part, session, agentId, mentorName, covered, mentorProblem, canAdd }) => {
        if (!session && !canAdd) return null;
        const requirement = session && {
          requiredCount: session.process.training.ojtRequiredCount,
          minCompletenessPercent: session.process.training.ojtMinCompletenessPercent,
          minOnTimePercent: session.process.training.ojtMinOnTimePercent,
        };
        return (
          <div key={part} className="flex flex-col gap-2 border-t border-neutral-100 pt-3">
            <h3 className="font-medium">
              {quick && part === "ARRIVAL_PART" ? `${messages.part.ARRIVAL_PART} + ${messages.part.DEPARTURE_PART}` : messages.part[part]}
            </h3>
            {session ? (
              <>
                <p className="flex flex-wrap gap-x-4 text-sm">
                  <span className="font-medium">{fmt(o.trainee, { name: session.trainee.name })}</span>
                  <span>
                    {canViewProcessOf(user, session.trainee.id) ? (
                      <Link href={`/training/processes/${session.process.id}`} className="text-sky-700 hover:underline">
                        {fmt(o.training, { name: session.process.training.name })}
                      </Link>
                    ) : (
                      fmt(o.training, { name: session.process.training.name })
                    )}
                  </span>
                  <span>{fmt(o.mentor, { name: mentorName ?? o.noMentor })}</span>
                </p>
                {!covered && <p className="text-sm text-orange-700">⚠ {o.setAside}</p>}
                {mentorProblem && (
                  <p className="text-sm text-orange-700">
                    ⚠ {fmt(o.mentorWarning, { trainee: session.trainee.name, reason: o.mentorProblems[mentorProblem] })}
                  </p>
                )}
                {covered && (
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-neutral-500">{session.metrics ? o.metricsTitle : o.liveMetrics}</span>
                    <OjtMetricsView metrics={session.metrics ?? ojtMetrics(task.timeline.rows, records, covered)} />
                    {requirement && (
                      <span className="text-xs text-neutral-500">
                        {fmt(o.thresholds, { completeness: requirement.minCompletenessPercent, onTime: requirement.minOnTimePercent })}
                      </span>
                    )}
                  </div>
                )}
                {session.verdict ? (
                  <div className="flex flex-col gap-1 text-sm">
                    <p>
                      <span className="text-neutral-500">{o.evaluateTitle}: </span>
                      <span className="font-semibold">{o.verdicts[session.verdict]}</span>
                      {session.comment && <> · {session.comment}</>}
                    </p>
                    {session.mentor && session.evaluatedAt && (
                      <p className="text-neutral-500">{fmt(o.evaluatedBy, { name: session.mentor.name, time: formatDateTime(session.evaluatedAt) })}</p>
                    )}
                    {requirement && <Suitability session={session} requirement={requirement} />}
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-neutral-600">{o.waiting}</p>
                    {covered && agentId === user.id && task.status === "COMPLETED" && session.process.status === "IN_PROGRESS" && (
                      <EvaluateForm action={evaluateAction.bind(null, task.id, session.id)} />
                    )}
                    {assigner && <RemoveTraineeButton action={removeTraineeAction.bind(null, task.id, session.id)} />}
                  </>
                )}
              </>
            ) : (
              <>
                <span className="text-sm text-neutral-600">{o.addTitle}</span>
                <AddTraineeForm
                  action={addTraineeAction.bind(null, task.id, part)}
                  candidates={candidates
                    .filter((candidate) => candidate.user.id !== agentId)
                    .map((candidate) => ({ id: candidate.id, label: `${candidate.user.name} · ${candidate.training.name}` }))}
                />
              </>
            )}
          </div>
        );
      })}
    </section>
  );
}
