import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getSheet, sheetCopy } from "@/lib/data/exams";
import { attemptResult, autoPoints, cleanChoices, deadlineOf, type GivenAnswer } from "@/lib/exams/scoring";
import { maxPointsOf, readSnapshot, sheetProblems, type ExamSnapshot } from "@/lib/exams/snapshot";

// E-exam attempts (CLAUDE.md, 10. mérföldkő, "Elméleti e-vizsga"): opened for
// the examinee by an examiner or the coordinator, filled by the examinee with
// their own login, scored by the system and, for written answers, by the
// examiner. Every attempt is kept.

const attemptInclude = {
  process: {
    select: {
      id: true,
      userId: true,
      status: true,
      user: { select: { id: true, name: true } },
      training: { select: { id: true, name: true, theoryPart: true, qualification: { select: { id: true, active: true } } } },
    },
  },
  answers: { orderBy: { questionIndex: "asc" } },
  openedBy: { select: { name: true } },
  gradedBy: { select: { name: true } },
} satisfies Prisma.ExamAttemptInclude;

export type AttemptRow = Prisma.ExamAttemptGetPayload<{ include: typeof attemptInclude }>;

export interface LoadedAttempt extends Omit<AttemptRow, "snapshot"> {
  snapshot: ExamSnapshot;
}

function load(row: AttemptRow): LoadedAttempt {
  return { ...row, snapshot: readSnapshot(row.snapshot) };
}

/** An attempt, closed first when its time is up (the saved answers are handed in). */
export async function getAttempt(id: string, now = new Date()): Promise<LoadedAttempt | null> {
  const row = await prisma.examAttempt.findUnique({ where: { id }, include: attemptInclude });
  if (!row) return null;
  if (!row.submittedAt && row.deadline && now.getTime() >= row.deadline.getTime()) {
    await finalize(id, row.deadline);
    return getAttempt(id, now);
  }
  return load(row);
}

export type OpenProblem = "process" | "theory" | "sheet" | "sheetProblems" | "alreadyOpen";

/**
 * Opens an attempt on a sheet of the process's training: it takes the copy of
 * the sheet's active questions and the pass mark. One open attempt per process.
 */
export async function openAttempt(processId: string, sheetId: string, actorId: string): Promise<{ id: string } | { problem: OpenProblem }> {
  const process = await prisma.trainingProcess.findUnique({
    where: { id: processId },
    select: { status: true, trainingId: true, training: { select: { theoryPart: true } } },
  });
  if (!process || process.status !== "IN_PROGRESS") return { problem: "process" };
  if (!process.training.theoryPart) return { problem: "theory" };
  const sheet = await getSheet(sheetId);
  if (!sheet || !sheet.active || sheet.trainingId !== process.trainingId) return { problem: "sheet" };
  const snapshot = sheetCopy(sheet);
  if (sheetProblems(snapshot).length > 0) return { problem: "sheetProblems" };
  try {
    const attempt = await prisma.examAttempt.create({
      data: {
        processId,
        sheetId,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        maxPoints: maxPointsOf(snapshot),
        openKey: processId,
        openedById: actorId,
      },
    });
    return { id: attempt.id };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return { problem: "alreadyOpen" };
    throw error;
  }
}

/** The examinee's first look starts the time. */
export async function startAttempt(id: string, now = new Date()): Promise<void> {
  const attempt = await prisma.examAttempt.findUnique({ where: { id }, select: { startedAt: true, submittedAt: true, snapshot: true } });
  if (!attempt || attempt.startedAt || attempt.submittedAt) return;
  const { timeLimitMinutes } = readSnapshot(attempt.snapshot);
  await prisma.examAttempt.updateMany({
    where: { id, startedAt: null },
    data: { startedAt: now, deadline: deadlineOf(now, timeLimitMinutes) },
  });
}

export type SaveProblem = "closed" | "question";

/** Saves one answer while the attempt is open and its time is not up. */
export async function saveAnswer(
  attempt: LoadedAttempt,
  questionIndex: number,
  answer: GivenAnswer,
  now = new Date(),
): Promise<SaveProblem | null> {
  if (attempt.submittedAt || !attempt.startedAt || (attempt.deadline && now.getTime() >= attempt.deadline.getTime())) return "closed";
  const question = attempt.snapshot.questions[questionIndex];
  if (!question) return "question";
  const data = {
    choices: cleanChoices(question, answer.choices),
    text: question.kind === "TEXT" ? (answer.text ?? "").slice(0, 5000) : null,
  };
  await prisma.examAnswer.upsert({
    where: { attemptId_questionIndex: { attemptId: attempt.id, questionIndex } },
    create: { attemptId: attempt.id, questionIndex, ...data },
    update: data,
  });
  return null;
}

/**
 * Hands the attempt in: the system scores the choice questions, every
 * question gets an answer row, and the result is set once no written answer
 * waits for the examiner.
 */
export async function finalize(id: string, submittedAt = new Date()): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Claimed first: of two hand-ins at once (the examinee and the clock) only one goes on.
    const claimed = await tx.examAttempt.updateMany({ where: { id, submittedAt: null }, data: { submittedAt, openKey: null } });
    if (claimed.count === 0) return;
    const attempt = await tx.examAttempt.findUniqueOrThrow({ where: { id }, include: { answers: true } });
    const snapshot = readSnapshot(attempt.snapshot);
    const given = new Map(attempt.answers.map((answer) => [answer.questionIndex, { choices: answer.choices, text: answer.text }]));
    const points = autoPoints(snapshot, given);
    for (const [index, value] of points.entries()) {
      await tx.examAnswer.upsert({
        where: { attemptId_questionIndex: { attemptId: id, questionIndex: index } },
        create: { attemptId: id, questionIndex: index, choices: [], text: null, points: value },
        update: { points: value },
      });
    }
    const result = attemptResult(snapshot.passPercent, attempt.maxPoints, points);
    await tx.examAttempt.update({
      where: { id },
      data: { scoredPoints: result.pending === 0 ? result.scored : null, passed: result.passed },
    });
  });
}

/** The examiner scores a written answer; the result follows once none waits. */
export async function gradeAnswer(
  attempt: LoadedAttempt,
  questionIndex: number,
  points: number,
  note: string | null,
  graderId: string,
): Promise<boolean> {
  const question = attempt.snapshot.questions[questionIndex];
  if (!attempt.submittedAt || !question || question.kind !== "TEXT" || points < 0 || points > question.points) return false;
  await prisma.$transaction(async (tx) => {
    await tx.examAnswer.update({
      where: { attemptId_questionIndex: { attemptId: attempt.id, questionIndex } },
      data: { points, graderNote: note, gradedById: graderId, gradedAt: new Date() },
    });
    const answers = await tx.examAnswer.findMany({ where: { attemptId: attempt.id }, orderBy: { questionIndex: "asc" } });
    const result = attemptResult(
      attempt.snapshot.passPercent,
      attempt.maxPoints,
      attempt.snapshot.questions.map((_, index) => answers.find((answer) => answer.questionIndex === index)?.points ?? null),
    );
    await tx.examAttempt.update({
      where: { id: attempt.id },
      data:
        result.pending === 0
          ? { scoredPoints: result.scored, passed: result.passed, gradedById: graderId, gradedAt: new Date() }
          : { scoredPoints: null, passed: null },
    });
  });
  return true;
}

export async function saveAttemptNotes(id: string, feedback: string | null, internalNote: string | null): Promise<void> {
  await prisma.examAttempt.update({ where: { id }, data: { feedback, internalNote } });
}

/** The attempts of a process, newest first, closing those whose time is up. */
export async function listProcessAttempts(processId: string, now = new Date()) {
  const rows = await prisma.examAttempt.findMany({
    where: { processId },
    include: attemptInclude,
    orderBy: { openedAt: "desc" },
  });
  const expired = rows.filter((row) => !row.submittedAt && row.deadline && now.getTime() >= row.deadline.getTime());
  for (const row of expired) await finalize(row.id, row.deadline!);
  const fresh = expired.length > 0 ? await prisma.examAttempt.findMany({ where: { processId }, include: attemptInclude, orderBy: { openedAt: "desc" } }) : rows;
  return fresh.map(load);
}

/** The attempts open for an examinee: to fill on their own page. */
export async function listOpenAttemptsOf(userId: string) {
  return prisma.examAttempt.findMany({
    where: { submittedAt: null, process: { userId, status: "IN_PROGRESS" } },
    select: { id: true, openedAt: true, deadline: true, startedAt: true, sheet: { select: { name: true } }, process: { select: { training: { select: { name: true } } } } },
    orderBy: { openedAt: "asc" },
  });
}
