import type { Prisma } from "@/generated/prisma/client";
import { practiceDay } from "@/lib/data/ojt";
import { getTaskView, taskAssignment, type TaskView } from "@/lib/data/tasks";
import { prisma } from "@/lib/db";
import { PRACTICAL_EXAM_LOOKBACK_DAYS } from "@/lib/exams/defaults";
import type { CriterionResult } from "@/lib/exams/practical";
import { agentOfPart, traineeOfPart } from "@/lib/permissions";
import { addDays, localDayRange, toLocalDate } from "@/lib/time";
import { hasPart, isPartCancelled, type Part } from "@/lib/turnaround";

// The practical exam (CLAUDE.md, 10. mérföldkő, "Gyakorlati vizsga"): on a
// real flight, a task part the examinee worked as its agent or as a trainee
// in the last days (a parameter), judged by the examiner per criterion.

export interface ExamTaskPart {
  task: TaskView;
  part: Part;
  day: string;
  /** How the examinee worked it. */
  role: "agent" | "trainee";
}

/** Whether the examinee worked the part, as its agent or as its trainee. */
export function examineeRole(task: TaskView, part: Part, userId: string): ExamTaskPart["role"] | null {
  if (!hasPart(task.timeline.kind, part) || isPartCancelled(task.flight, part)) return null;
  const assignment = taskAssignment(task);
  if (agentOfPart(assignment, part) === userId) return "agent";
  if (traineeOfPart(assignment, part) === userId) return "trainee";
  return null;
}

/** The task parts of the examinee in the last days, newest first. */
export async function listExamineeTaskParts(userId: string, today = toLocalDate(new Date())): Promise<ExamTaskPart[]> {
  const from = localDayRange(addDays(today, -PRACTICAL_EXAM_LOOKBACK_DAYS)).start;
  const to = localDayRange(today).end;
  const inRange = { gte: from, lt: to };
  const rows = await prisma.task.findMany({
    where: {
      OR: [{ arrivalAgentId: userId }, { departureAgentId: userId }, { ojtSessions: { some: { traineeId: userId } } }],
      flight: { OR: [{ sta: inRange }, { std: inRange }] },
    },
    select: { id: true },
  });
  const views = (await Promise.all(rows.map((row) => getTaskView(row.id)))).filter((view): view is TaskView => !!view);
  const parts: ExamTaskPart[] = [];
  for (const task of views) {
    for (const part of ["ARRIVAL_PART", "DEPARTURE_PART"] as const) {
      const role = examineeRole(task, part, userId);
      const day = practiceDay(task, part);
      if (role && day >= addDays(today, -PRACTICAL_EXAM_LOOKBACK_DAYS) && day <= today) parts.push({ task, part, day, role });
    }
  }
  return parts.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
}

export type { CriterionResult } from "@/lib/exams/practical";

export async function recordPracticalExam(data: {
  processId: string;
  taskId: string;
  part: Part;
  examinerId: string;
  results: CriterionResult[];
  verdict: "PASS" | "FAIL";
  feedback: string | null;
  internalNote: string | null;
}): Promise<string> {
  const exam = await prisma.practicalExam.create({
    data: { ...data, results: data.results as unknown as Prisma.InputJsonValue },
  });
  return exam.id;
}

export async function listProcessPracticalExams(processId: string) {
  return prisma.practicalExam.findMany({
    where: { processId },
    include: {
      examiner: { select: { name: true } },
      task: {
        select: {
          id: true,
          taskType: { select: { code: true } },
          flight: { select: { inboundFlightNumber: true, outboundFlightNumber: true, sta: true, std: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Reads the stored results back; their shape is ours. */
export function readResults(value: unknown): CriterionResult[] {
  return Array.isArray(value) ? (value as CriterionResult[]) : [];
}

export async function activeCriteria(trainingId: string) {
  return prisma.practicalCriterion.findMany({ where: { trainingId, active: true }, orderBy: { order: "asc" } });
}
