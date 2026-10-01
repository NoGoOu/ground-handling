import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { hasParts } from "@/lib/exams/process";

// Training processes (CLAUDE.md, 10. mérföldkő, "Képzési folyamat"): one agent
// going through the parts of one training, started by the coordinator. The
// database keeps one open process per agent and training (openKey).

const processInclude = {
  user: { select: { id: true, name: true, active: true } },
  training: {
    select: {
      id: true,
      name: true,
      theoryPart: true,
      practicalPart: true,
      passPercent: true,
      ojtRequiredCount: true,
      ojtMinCompletenessPercent: true,
      ojtMinOnTimePercent: true,
      qualification: { select: { id: true, code: true, name: true, active: true, validityMonths: true } },
    },
  },
  startedBy: { select: { name: true } },
  abortedBy: { select: { name: true } },
  releasedBy: { select: { name: true } },
} satisfies Prisma.TrainingProcessInclude;

export type ProcessRow = Prisma.TrainingProcessGetPayload<{ include: typeof processInclude }>;

export async function getProcess(id: string): Promise<ProcessRow | null> {
  return prisma.trainingProcess.findUnique({ where: { id }, include: processInclude });
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

/** The active sheets of a training, for opening an attempt. */
export async function listTrainingSheets(trainingId: string) {
  return prisma.examSheet.findMany({ where: { trainingId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
}
