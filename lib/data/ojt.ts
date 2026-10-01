import type { Prisma } from "@/generated/prisma/client";
import { qualificationRecords } from "@/lib/data/training";
import type { OjtSessionView, TaskView } from "@/lib/data/tasks";
import { prisma } from "@/lib/db";
import { eligibility, type EligibilityProblem } from "@/lib/exams/eligibility";
import { ojtMetrics, sessionParts } from "@/lib/exams/ojt";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { agentOfPart, canMentor } from "@/lib/permissions";
import { loadUser } from "@/lib/session";
import { toLocalDate } from "@/lib/time";
import { hasPart, isPartCancelled, type Part } from "@/lib/turnaround";

// On the job training on a task (CLAUDE.md, 10. mérföldkő, "On the job
// gyakorlás"): a trainee next to the agent of a part, the mentor. Only a part
// whose agent may mentor takes a trainee; after the task the mentor evaluates
// the practice, and its metrics are frozen then.

type TaskAssignmentLike = Parameters<typeof agentOfPart>[0];

/** The day of a practice: the day its part's window starts on, else the task's day. */
export function practiceDay(task: TaskView, part: Part): string {
  const window =
    task.timeline.shape.windows.find((w) => w.part === part || w.part === "WHOLE") ?? task.timeline.shape.windows[0];
  const anchor = window?.start ?? task.timeline.arrivalAnchor ?? task.timeline.departureAnchor ?? new Date();
  return toLocalDate(anchor);
}

export type MentorProblem = EligibilityProblem | "noAgent";

/** Whether the user may mentor the training on the day: the permission and the qualification. */
export async function mentorProblemOf(
  userId: string | null,
  qualification: { id: string; active: boolean } | null,
  day: string,
): Promise<MentorProblem | null> {
  if (!userId) return "noAgent";
  const user = await loadUser(userId);
  if (!user) return "noAgent";
  const records = (await qualificationRecords([userId])).get(userId) ?? [];
  return eligibility(canMentor(user), qualification, records, day);
}

/** The open processes with a practical part: whom a trainee can be added for. */
export async function listOjtCandidates() {
  return prisma.trainingProcess.findMany({
    where: { status: "IN_PROGRESS", training: { practicalPart: true }, user: { active: true } },
    select: { id: true, user: { select: { id: true, name: true } }, training: { select: { id: true, name: true } } },
    orderBy: [{ user: { name: "asc" } }, { training: { name: "asc" } }],
  });
}

export type AddProblem =
  | "part"
  | "quickDeparture"
  | "cancelled"
  | "process"
  | "noAgent"
  | "sameAsAgent"
  | "permission"
  | "qualification"
  | "taken";

/**
 * Adds a trainee next to the agent of a part, counted into one of their open
 * processes. On a quick turnaround the arrival trainee works both parts, so
 * only the arrival part takes one.
 */
export async function addTrainee(
  task: TaskView,
  assignment: TaskAssignmentLike,
  part: Part,
  processId: string,
  actorId: string,
): Promise<AddProblem | null> {
  if (!hasPart(task.timeline.kind, part)) return "part";
  if (task.timeline.shape.type === "QUICK" && part === "DEPARTURE_PART") return "quickDeparture";
  if (isPartCancelled(task.flight, part)) return "cancelled";
  const process = await prisma.trainingProcess.findUnique({
    where: { id: processId },
    select: { status: true, userId: true, training: { select: { practicalPart: true, qualification: { select: { id: true, active: true } } } } },
  });
  if (!process || process.status !== "IN_PROGRESS" || !process.training.practicalPart) return "process";
  const agentId = agentOfPart(assignment, part);
  if (!agentId) return "noAgent";
  if (agentId === process.userId) return "sameAsAgent";
  // Only next to an agent who may mentor this training on the day of the practice.
  const mentor = await mentorProblemOf(agentId, process.training.qualification, practiceDay(task, part));
  if (mentor) return mentor;
  try {
    await prisma.ojtSession.create({ data: { taskId: task.id, part, traineeId: process.userId, processId, addedById: actorId } });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return "taken";
    throw error;
  }
  return null;
}

/** A practice not yet evaluated can be taken off; the trainee's records stay. */
export async function removeTrainee(sessionId: string): Promise<boolean> {
  return (await prisma.ojtSession.deleteMany({ where: { id: sessionId, verdict: null } })).count > 0;
}

export type EvaluateProblem = "notCompleted" | "evaluated" | "process" | "setAside" | "notMentor" | EligibilityProblem;

/**
 * The mentor's evaluation after the task: pass or fail with a comment, and
 * the metrics of the parts the practice covers, frozen now.
 */
export async function evaluateSession(
  task: TaskView,
  assignment: TaskAssignmentLike,
  session: OjtSessionView,
  actorId: string,
  verdict: "PASS" | "FAIL",
  comment: string | null,
): Promise<EvaluateProblem | null> {
  if (session.verdict) return "evaluated";
  if (task.status !== "COMPLETED") return "notCompleted";
  if (session.process.status !== "IN_PROGRESS") return "process";
  const parts = sessionParts(session.part, task.timeline.shape.type);
  if (!parts) return "setAside";
  if (agentOfPart(assignment, session.part) !== actorId) return "notMentor";
  const mentor = await mentorProblemOf(actorId, session.process.training.qualification, practiceDay(task, session.part));
  if (mentor === "noAgent") return "notMentor";
  if (mentor) return mentor;
  const metrics = ojtMetrics(
    task.timeline.rows,
    [...task.records].map(([milestoneId, record]) => ({ milestoneId, byTrainee: record.byTrainee })),
    parts,
  );
  const updated = await prisma.ojtSession.updateMany({
    where: { id: session.id, verdict: null },
    data: { verdict, comment, metrics: metrics as unknown as Prisma.InputJsonValue, mentorId: actorId, evaluatedAt: new Date() },
  });
  return updated.count > 0 ? null : "evaluated";
}

/**
 * After an assignment changes: a part with a trainee whose new agent may not
 * mentor gets a warning (it never blocks), one line per part.
 */
export async function mentorWarnings(task: TaskView, assignment: TaskAssignmentLike): Promise<string[]> {
  const warnings: string[] = [];
  for (const session of task.ojt) {
    if (!sessionParts(session.part, task.timeline.shape.type)) continue;
    const problem = await mentorProblemOf(agentOfPart(assignment, session.part), session.process.training.qualification, practiceDay(task, session.part));
    if (problem) {
      warnings.push(fmt(messages.ojt.mentorWarning, { trainee: session.trainee.name, reason: messages.ojt.mentorProblems[problem] }));
    }
  }
  return warnings;
}

/** The practices of a process, for its page: the task, the part, the mentor and the evaluation. */
export async function listProcessSessions(processId: string) {
  return prisma.ojtSession.findMany({
    where: { processId },
    include: {
      mentor: { select: { name: true } },
      task: {
        select: {
          id: true,
          arrivalAgent: { select: { id: true, name: true } },
          departureAgent: { select: { id: true, name: true } },
          taskType: { select: { code: true } },
          flight: { select: { inboundFlightNumber: true, outboundFlightNumber: true, sta: true, std: true } },
        },
      },
    },
    orderBy: { addedAt: "desc" },
  });
}
