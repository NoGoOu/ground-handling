"use server";

import { refresh } from "next/cache";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import { assignmentUpdate, type ConflictKind } from "@/lib/board";
import { getBoardForDay } from "@/lib/data/board";
import { getTaskView } from "@/lib/data/tasks";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canAssignAgents } from "@/lib/permissions";
import type { Part } from "@/lib/turnaround";

// Dropping a box on a lane. Conflicts only warn, they never block (CLAUDE.md,
// "Kiosztás és ütközés").

const t = messages.board;

function isPart(value: unknown): value is Part | "WHOLE" {
  return value === "WHOLE" || value === "ARRIVAL_PART" || value === "DEPARTURE_PART";
}

/** The conflicts of one box after the change, as a warning message. */
async function conflictWarning(localDate: string, boxId: string): Promise<string | undefined> {
  const board = await getBoardForDay(localDate);
  const box = board.lanes.flatMap((lane) => lane.boxes).find((candidate) => candidate.id === boxId);
  if (!box || box.conflicts.length === 0) return undefined;
  const reasons = box.conflicts.map((kind: ConflictKind) => t.conflicts[kind]).join(", ");
  return fmt(t.conflictWarning, { reasons });
}

export async function assignBox(localDate: string, _previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canAssignAgents);

    const taskId = formData.get("taskId");
    const part = formData.get("part");
    const rawAgentId = formData.get("agentId");
    if (typeof taskId !== "string" || !isPart(part)) throw new ActionError(messages.errors.invalidInput);

    const task = await getTaskView(taskId);
    if (!task) throw new ActionError(messages.errors.notFound);

    let agentId: string | null = null;
    if (typeof rawAgentId === "string" && rawAgentId !== "") {
      const agent = await prisma.user.findFirst({
        where: { id: rawAgentId, role: "AGENT", active: true },
        select: { id: true },
      });
      if (!agent) throw new ActionError(messages.assignment.invalidAgent);
      agentId = agent.id;
    }

    const update = assignmentUpdate(part, task.timeline.shape.type, agentId, {
      arrivalAgentId: task.arrivalAgent?.id ?? null,
      departureAgentId: task.departureAgent?.id ?? null,
    });
    await prisma.task.update({ where: { id: taskId }, data: update });
    refresh();

    if (!agentId) return { ok: true, warning: undefined };
    return { ok: true, warning: await conflictWarning(localDate, `${taskId}:${part}`) };
  });
}
