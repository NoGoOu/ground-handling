import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { buildSnapshot, maxPointsOf, sheetProblems, type SheetProblem } from "@/lib/exams/snapshot";

// The exams' data (CLAUDE.md, 10. mérföldkő): the question bank, the exam
// sheets, and per training its parts, OJT requirement and practical criteria.
// Questions and criteria are never deleted, only made inactive: attempts and
// practical exams keep their own copies.

export interface QuestionData {
  text: string;
  kind: "SINGLE" | "MULTIPLE" | "TEXT";
  points: number;
  topic: string | null;
  active: boolean;
  options: { text: string; correct: boolean }[];
}

const questionInclude = { options: { orderBy: { order: "asc" } }, _count: { select: { sheets: true } } } satisfies Prisma.ExamQuestionInclude;

export async function listQuestions() {
  return prisma.examQuestion.findMany({
    include: questionInclude,
    orderBy: [{ active: "desc" }, { topic: "asc" }, { createdAt: "asc" }],
  });
}

export async function getQuestion(id: string) {
  return prisma.examQuestion.findUnique({ where: { id }, include: questionInclude });
}

/** Creates or updates a question; its options are replaced as a whole. */
export async function saveQuestion(id: string | null, data: QuestionData): Promise<string | null> {
  const { options, ...fields } = data;
  const rows = options.map((option, order) => ({ order, text: option.text, correct: option.correct }));
  return prisma.$transaction(async (tx) => {
    if (!id) return (await tx.examQuestion.create({ data: { ...fields, options: { create: rows } } })).id;
    const found = await tx.examQuestion.findUnique({ where: { id }, select: { id: true } });
    if (!found) return null;
    await tx.examOption.deleteMany({ where: { questionId: id } });
    await tx.examQuestion.update({ where: { id }, data: { ...fields, options: { create: rows } } });
    return id;
  });
}

const sheetInclude = {
  training: { select: { id: true, name: true, passPercent: true } },
  questions: {
    orderBy: { order: "asc" },
    include: { question: { include: { options: { orderBy: { order: "asc" } } } } },
  },
} satisfies Prisma.ExamSheetInclude;

export type SheetWithQuestions = Prisma.ExamSheetGetPayload<{ include: typeof sheetInclude }>;

export async function listSheets() {
  return prisma.examSheet.findMany({ include: sheetInclude, orderBy: [{ active: "desc" }, { name: "asc" }] });
}

export async function getSheet(id: string) {
  return prisma.examSheet.findUnique({ where: { id }, include: sheetInclude });
}

/**
 * What an attempt on the sheet would get: its active questions in order.
 * An inactive question stays on the sheet, struck through, but a new attempt
 * leaves it out.
 */
export function sheetCopy(sheet: SheetWithQuestions) {
  return buildSnapshot(
    {
      id: sheet.id,
      name: sheet.name,
      trainingId: sheet.trainingId,
      timeLimitMinutes: sheet.timeLimitMinutes,
      multipleScoring: sheet.multipleScoring,
      questions: sheet.questions.filter((entry) => entry.question.active),
    },
    sheet.training.passPercent ?? 0,
  );
}

export function sheetSummary(sheet: SheetWithQuestions): { count: number; points: number; problems: SheetProblem[] } {
  const copy = sheetCopy(sheet);
  return { count: copy.questions.length, points: maxPointsOf(copy), problems: sheetProblems(copy) };
}

/** Trainings a sheet can belong to: those with an exam and a pass mark. */
export async function listSheetTrainings() {
  return prisma.training.findMany({
    where: { hasExam: true, passPercent: { not: null } },
    select: { id: true, name: true, passPercent: true },
    orderBy: { name: "asc" },
  });
}

/** Appends an active question that is not on the sheet yet; false otherwise. */
export async function addSheetQuestion(sheetId: string, questionId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const question = await tx.examQuestion.findUnique({ where: { id: questionId }, select: { active: true } });
    const there = await tx.examSheetQuestion.findUnique({ where: { sheetId_questionId: { sheetId, questionId } } });
    if (!question?.active || there) return false;
    const last = await tx.examSheetQuestion.aggregate({ where: { sheetId }, _max: { order: true } });
    await tx.examSheetQuestion.create({ data: { sheetId, questionId, order: (last._max.order ?? 0) + 1 } });
    return true;
  });
}

export async function removeSheetQuestion(entryId: string): Promise<boolean> {
  return (await prisma.examSheetQuestion.deleteMany({ where: { id: entryId } })).count > 0;
}

/** Swaps an item with its neighbour above (-1) or below (1) in an ordered list. */
async function swapWithNeighbour(
  items: { id: string; order: number }[],
  id: string,
  direction: -1 | 1,
  update: (id: string, order: number) => Promise<unknown>,
): Promise<boolean> {
  const sorted = [...items].sort((a, b) => a.order - b.order);
  const index = sorted.findIndex((item) => item.id === id);
  const other = sorted[index + direction];
  if (index < 0 || !other) return false;
  await update(sorted[index].id, other.order);
  await update(other.id, sorted[index].order);
  return true;
}

export async function moveSheetQuestion(entryId: string, direction: -1 | 1): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.examSheetQuestion.findUnique({ where: { id: entryId }, select: { sheetId: true } });
    if (!entry) return false;
    const items = await tx.examSheetQuestion.findMany({ where: { sheetId: entry.sheetId }, select: { id: true, order: true } });
    return swapWithNeighbour(items, entryId, direction, (id, order) => tx.examSheetQuestion.update({ where: { id }, data: { order } }));
  });
}

/** Every training with its parts, OJT requirement and what the exams have of it. */
export async function listExamTrainings() {
  return prisma.training.findMany({
    include: {
      qualification: { select: { code: true, name: true } },
      _count: { select: { examSheets: true, criteria: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getExamTraining(id: string) {
  return prisma.training.findUnique({
    where: { id },
    include: {
      qualification: { select: { code: true, name: true } },
      criteria: { orderBy: { order: "asc" } },
    },
  });
}

export async function addCriterion(trainingId: string, text: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const last = await tx.practicalCriterion.aggregate({ where: { trainingId }, _max: { order: true } });
    await tx.practicalCriterion.create({ data: { trainingId, text, order: (last._max.order ?? 0) + 1 } });
  });
}

export async function moveCriterion(id: string, direction: -1 | 1): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const criterion = await tx.practicalCriterion.findUnique({ where: { id }, select: { trainingId: true } });
    if (!criterion) return false;
    const items = await tx.practicalCriterion.findMany({ where: { trainingId: criterion.trainingId }, select: { id: true, order: true } });
    return swapWithNeighbour(items, id, direction, (itemId, order) => tx.practicalCriterion.update({ where: { id: itemId }, data: { order } }));
  });
}
