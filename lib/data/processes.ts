import type { Prisma } from "@/generated/prisma/client";
import { finalize } from "@/lib/data/attempts";
import { prisma } from "@/lib/db";
import { ojtProgress, readMetrics, type OjtProgress } from "@/lib/exams/ojt";
import { hasParts, latestPassedPercent, processParts, processState, releaseRecord, type ProcessParts, type ProcessState } from "@/lib/exams/process";
import { percentOf } from "@/lib/exams/scoring";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";

// Training processes (CLAUDE.md, 10. mérföldkő, "Képzési folyamat"): one agent
// going through the parts of one training, started and aborted by the
// coordinator. The database keeps one open process per agent and training
// (openKey). "Kibocsátható" is worked out from the parts, never stored.

const processInclude = {
  user: { select: { id: true, name: true, active: true } },
  training: {
    select: {
      id: true,
      name: true,
      theoryPart: true,
      practicalPart: true,
      passPercent: true,
      hasExam: true,
      ojtRequiredCount: true,
      ojtMinCompletenessPercent: true,
      ojtMinOnTimePercent: true,
      qualification: { select: { id: true, code: true, name: true, active: true, validityMonths: true } },
    },
  },
  startedBy: { select: { name: true } },
  abortedBy: { select: { name: true } },
  releasedBy: { select: { name: true } },
  attempts: { select: { passed: true, submittedAt: true, scoredPoints: true, maxPoints: true } },
  ojtSessions: { select: { verdict: true, metrics: true } },
  practicalExams: { select: { verdict: true } },
} satisfies Prisma.TrainingProcessInclude;

type ProcessRowBase = Prisma.TrainingProcessGetPayload<{ include: typeof processInclude }>;

export interface ProcessRow extends ProcessRowBase {
  parts: ProcessParts;
  state: ProcessState;
  ojt: OjtProgress;
}

export const ojtRequirementOf = (training: ProcessRowBase["training"]) => ({
  requiredCount: training.ojtRequiredCount,
  minCompletenessPercent: training.ojtMinCompletenessPercent,
  minOnTimePercent: training.ojtMinOnTimePercent,
});

/** The parts and the state of a process from its attempts, practices and practical exams. */
function withState(row: ProcessRowBase): ProcessRow {
  const ojt = ojtProgress(
    row.ojtSessions.map((session) => ({ verdict: session.verdict, metrics: readMetrics(session.metrics) })),
    ojtRequirementOf(row.training),
  );
  const parts = processParts(row.training, {
    theoryPassed: row.attempts.some((attempt) => attempt.passed === true),
    ojt,
    practicalPassed: row.practicalExams.some((exam) => exam.verdict === "PASS"),
  });
  return { ...row, parts, ojt, state: processState(row.status, parts) };
}

export async function getProcess(id: string): Promise<ProcessRow | null> {
  const row = await prisma.trainingProcess.findUnique({ where: { id }, include: processInclude });
  return row && withState(row);
}

/** Processes of the given people (everyone when null), open ones first, newest first. */
export async function listProcesses(userIds: readonly string[] | null): Promise<ProcessRow[]> {
  const rows = await prisma.trainingProcess.findMany({
    where: userIds ? { userId: { in: [...userIds] } } : {},
    include: processInclude,
    orderBy: [{ startedAt: "desc" }],
  });
  const order: Record<ProcessState, number> = { READY: 0, IN_PROGRESS: 1, RELEASED: 2, ABORTED: 3 };
  return rows.map(withState).sort((a, b) => order[a.state] - order[b.state] || b.startedAt.getTime() - a.startedAt.getTime());
}

export type StartProblem = "training" | "noParts" | "user" | "alreadyOpen";

export async function startProcess(userId: string, trainingId: string, actorId: string): Promise<{ id: string } | { problem: StartProblem }> {
  const [training, user] = await Promise.all([
    prisma.training.findUnique({ where: { id: trainingId }, select: { theoryPart: true, practicalPart: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { active: true, teamId: true } }),
  ]);
  if (!training) return { problem: "training" };
  if (!hasParts(training)) return { problem: "noParts" };
  // A process is for an agent: an active member of a team (rule 12).
  if (!user?.active || !user.teamId) return { problem: "user" };
  try {
    const process = await prisma.trainingProcess.create({
      data: { userId, trainingId, openKey: `${userId}:${trainingId}`, startedById: actorId },
    });
    return { id: process.id };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return { problem: "alreadyOpen" };
    throw error;
  }
}

/**
 * Aborts a running process. An attempt still open is handed in with the
 * answers saved so far, so nobody goes on filling an exam of an aborted process.
 */
export async function abortProcess(id: string, actorId: string, reason: string | null): Promise<boolean> {
  const aborted = await prisma.trainingProcess.updateMany({
    where: { id, status: "IN_PROGRESS" },
    data: { status: "ABORTED", openKey: null, abortedById: actorId, abortedAt: new Date(), abortReason: reason },
  });
  if (aborted.count === 0) return false;
  const open = await prisma.examAttempt.findMany({ where: { processId: id, submittedAt: null }, select: { id: true } });
  for (const attempt of open) await finalize(attempt.id);
  return true;
}

export type ReleaseProblem = "notReady" | "taken";

/**
 * Releases a process whose every prescribed part is passed: the passed
 * training record is made (completed today, valid by the qualification, with
 * the result of the latest passed e-exam), and the qualification comes from
 * it as before. Of two releases at once only one goes through.
 */
export async function releaseProcess(id: string, actorId: string, today: string): Promise<{ recordId: string } | { problem: ReleaseProblem }> {
  const process = await getProcess(id);
  if (!process || process.state !== "READY") return { problem: "notReady" };
  const examPercent = process.training.hasExam
    ? latestPassedPercent(
        process.attempts.map((attempt) => ({
          passed: attempt.passed,
          submittedAt: attempt.submittedAt,
          percent: attempt.scoredPoints === null ? null : percentOf(attempt.scoredPoints, attempt.maxPoints),
        })),
      )
    : null;
  const values = releaseRecord(process.training, today, examPercent);
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.trainingProcess.updateMany({
      where: { id, status: "IN_PROGRESS" },
      data: { status: "RELEASED", openKey: null, releasedById: actorId, releasedAt: new Date() },
    });
    if (claimed.count === 0) return { problem: "taken" as const };
    const record = await tx.trainingRecord.create({
      data: {
        userId: process.userId,
        trainingId: process.trainingId,
        completedOn: new Date(`${values.completedOn}T00:00:00Z`),
        examPercent: values.examPercent,
        passed: true,
        validUntil: values.validUntil ? new Date(`${values.validUntil}T00:00:00Z`) : null,
        validUntilManual: false,
        note: fmt(messages.release.recordNote, { training: process.training.name }),
        createdById: actorId,
      },
    });
    await tx.trainingProcess.update({ where: { id }, data: { recordId: record.id } });
    return { recordId: record.id };
  });
}

/** The active sheets of a training, for opening an attempt. */
export async function listTrainingSheets(trainingId: string) {
  return prisma.examSheet.findMany({ where: { trainingId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
}

/** Who a process can be started for: active agents (team members), and the trainings with a part. */
export async function processStartOptions() {
  const [agents, trainings] = await Promise.all([
    prisma.user.findMany({ where: { active: true, teamId: { not: null } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.training.findMany({
      where: { OR: [{ theoryPart: true }, { practicalPart: true }] },
      select: { id: true, name: true, theoryPart: true, practicalPart: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return { agents, trainings };
}
