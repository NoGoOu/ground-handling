"use server";

import { refresh } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { canManageTeams } from "@/lib/permissions";

const e = messages.teamForm.errors;

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function parseTeam(formData: FormData): Promise<{ name: string; leaderId: string }> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length === 0 || name.length > 60) throw new ActionError(e.name);

  const leaderId = String(formData.get("leaderId") ?? "");
  const leader = await prisma.user.findFirst({ where: { id: leaderId, active: true }, select: { id: true } });
  if (!leader) throw new ActionError(e.leader);

  return { name, leaderId: leader.id };
}

export async function createTeam(_previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canManageTeams);
    const data = await parseTeam(formData);
    try {
      await prisma.team.create({ data });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ActionError(e.nameTaken);
      throw error;
    }
    refresh();
  });
}

export async function updateTeam(
  teamId: string,
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canManageTeams);
    const existing = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true } });
    if (!existing) throw new ActionError(e.notFound);

    const data = await parseTeam(formData);
    try {
      await prisma.team.update({ where: { id: teamId }, data });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ActionError(e.nameTaken);
      throw error;
    }
    refresh();
  });
}
