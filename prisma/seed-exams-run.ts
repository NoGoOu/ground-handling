import type { Prisma } from "@/generated/prisma/client";
import { finalize, gradeAnswer, getAttempt, openAttempt, saveAnswer, saveAttemptNotes, startAttempt } from "@/lib/data/attempts";
import { addCriterion, addSheetQuestion, saveQuestion } from "@/lib/data/exams";
import { startProcess } from "@/lib/data/processes";
import { getTaskView } from "@/lib/data/tasks";
import { prisma } from "@/lib/db";
import { ojtMetrics, sessionParts } from "@/lib/exams/ojt";
import { defaultValidUntil } from "@/lib/qualifications";
import { addDays } from "@/lib/time";
import {
  SEED_ATTEMPTS,
  SEED_CRITERIA,
  SEED_EXAM_TRAININGS,
  SEED_EXAMINER_QUALIFICATIONS,
  SEED_PRACTICE,
  SEED_QUESTIONS,
  SEED_SHEETS,
  type SeedQuestionKey,
} from "./seed-exams";
import { SEED_COURSES, SEED_QUALIFICATIONS } from "./seed-training";

// Writes the exam demo data (CLAUDE.md, 10. mérföldkő, 9. lépés) through the
// same data functions the pages use, after the rest of the seed: the parts of
// the trainings, the question bank, the sheets, the criteria, the examiner's
// qualifications, a half-way process and one ready for release.

const HOUR_MS = 3600_000;

async function userId(username: string): Promise<string> {
  return (await prisma.user.findUniqueOrThrow({ where: { username }, select: { id: true } })).id;
}

async function trainingId(name: string): Promise<string> {
  return (await prisma.training.findUniqueOrThrow({ where: { name }, select: { id: true } })).id;
}

/** An attempt filled and handed in, then moved back in time as if it had happened then. */
async function pastAttempt(processId: string, sheetId: string, openedBy: string, answers: { choices: number[]; text: string | null }[], hoursAgo: number) {
  const opened = await openAttempt(processId, sheetId, openedBy);
  if ("problem" in opened) throw new Error(`Seed attempt: ${opened.problem}`);
  await startAttempt(opened.id);
  const attempt = (await getAttempt(opened.id))!;
  for (const [index, answer] of answers.entries()) await saveAnswer(attempt, index, answer);
  await finalize(opened.id);
  const at = new Date(Date.now() - hoursAgo * HOUR_MS);
  await prisma.examAttempt.update({
    where: { id: opened.id },
    data: { openedAt: at, startedAt: at, deadline: attempt.deadline ? new Date(at.getTime() + (attempt.deadline.getTime() - attempt.startedAt!.getTime())) : null, submittedAt: new Date(at.getTime() + 15 * 60_000) },
  });
  return opened.id;
}

export async function seedExams(localDate: string): Promise<void> {
  const [coordinator, examiner, mentor, trainee] = await Promise.all(["koordinator", "vizsgaztato", "ugynok1", "ugynok2"].map(userId));

  // The parts of the demo trainings.
  for (const { course, ...parts } of SEED_EXAM_TRAININGS) {
    await prisma.training.update({ where: { name: course }, data: parts });
  }

  // The question bank and the sheets.
  const questionIds = new Map<SeedQuestionKey, string>();
  for (const [key, question] of Object.entries(SEED_QUESTIONS) as [SeedQuestionKey, (typeof SEED_QUESTIONS)[SeedQuestionKey]][]) {
    questionIds.set(key, (await saveQuestion(null, question))!);
  }
  const sheetIds = new Map<string, string>();
  for (const sheet of SEED_SHEETS) {
    const created = await prisma.examSheet.create({
      data: { name: sheet.name, trainingId: await trainingId(sheet.course), timeLimitMinutes: sheet.timeLimitMinutes, multipleScoring: sheet.multipleScoring },
    });
    for (const key of sheet.questions) await addSheetQuestion(created.id, questionIds.get(key)!);
    sheetIds.set(sheet.name, created.id);
  }
  const practicalTraining = await trainingId(SEED_CRITERIA.course);
  for (const text of SEED_CRITERIA.texts) await addCriterion(practicalTraining, text);

  // The examiner holds the qualifications they judge.
  for (const code of SEED_EXAMINER_QUALIFICATIONS) {
    const course = SEED_COURSES.find((c) => c.qualification === code)!;
    const qualification = SEED_QUALIFICATIONS.find((q) => q.code === code)!;
    const completedOn = addDays(localDate, -30);
    const validUntil = defaultValidUntil(completedOn, qualification.validityMonths);
    await prisma.trainingRecord.create({
      data: {
        userId: examiner,
        trainingId: await trainingId(course.name),
        completedOn: new Date(`${completedOn}T00:00:00Z`),
        examPercent: course.hasExam ? 92 : null,
        passed: true,
        validUntil: validUntil ? new Date(`${validUntil}T00:00:00Z`) : null,
        createdById: coordinator,
      },
    });
  }

  // Half way: Nagy Eszter renews her expired qualification with both parts.
  const halfWay = await startProcess(trainee, practicalTraining, coordinator);
  if ("problem" in halfWay) throw new Error(`Seed process: ${halfWay.problem}`);
  await prisma.trainingProcess.update({ where: { id: halfWay.id }, data: { startedAt: new Date(Date.now() - 96 * HOUR_MS) } });
  const { failed } = SEED_ATTEMPTS;
  const failedId = await pastAttempt(halfWay.id, sheetIds.get(failed.sheet)!, coordinator, failed.answers, 72);
  const written = failed.answers.findIndex((answer) => answer.text !== null);
  await gradeAnswer((await getAttempt(failedId))!, written, failed.writtenPoints, failed.graderNote, examiner);
  await saveAttemptNotes(failedId, failed.feedback, failed.internalNote);
  await prisma.examAttempt.update({ where: { id: failedId }, data: { gradedAt: new Date(Date.now() - 70 * HOUR_MS) } });
  // A new attempt is open for her to fill.
  const open = await openAttempt(halfWay.id, sheetIds.get(failed.sheet)!, examiner);
  if ("problem" in open) throw new Error(`Seed attempt: ${open.problem}`);

  // Her practice next to Kiss Péter on the completed quick turnaround, evaluated.
  const flight = await prisma.flight.findFirstOrThrow({ where: { inboundFlightNumber: SEED_PRACTICE.flight }, select: { id: true } });
  const task = await prisma.task.findFirstOrThrow({ where: { flightId: flight.id, isPrimary: true }, select: { id: true } });
  await prisma.milestoneRecord.updateMany({
    where: { taskId: task.id, milestoneDefinition: { code: { in: [...SEED_PRACTICE.traineeRecords] } } },
    data: { recordedById: trainee, byTrainee: true },
  });
  const session = await prisma.ojtSession.create({
    data: { taskId: task.id, part: "ARRIVAL_PART", traineeId: trainee, processId: halfWay.id, addedById: await userId("vezeto") },
  });
  const view = (await getTaskView(task.id))!;
  const parts = sessionParts("ARRIVAL_PART", view.timeline.shape.type)!;
  const metrics = ojtMetrics(view.timeline.rows, [...view.records].map(([milestoneId, r]) => ({ milestoneId, byTrainee: r.byTrainee })), parts);
  await prisma.ojtSession.update({
    where: { id: session.id },
    data: { verdict: "PASS", comment: SEED_PRACTICE.comment, metrics: metrics as unknown as Prisma.InputJsonValue, mentorId: mentor, evaluatedAt: new Date() },
  });

  // Ready for release: her theory-only refresher, passed.
  const refresher = SEED_EXAM_TRAININGS.find((t) => !t.practicalPart)!;
  const ready = await startProcess(trainee, await trainingId(refresher.course), coordinator);
  if ("problem" in ready) throw new Error(`Seed process: ${ready.problem}`);
  await prisma.trainingProcess.update({ where: { id: ready.id }, data: { startedAt: new Date(Date.now() - 48 * HOUR_MS) } });
  const { passed } = SEED_ATTEMPTS;
  const passedId = await pastAttempt(ready.id, sheetIds.get(passed.sheet)!, examiner, passed.answers, 24);
  await saveAttemptNotes(passedId, passed.feedback, null);
}
