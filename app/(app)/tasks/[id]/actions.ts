"use server";

import { refresh } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { TaskStatus } from "@/generated/prisma/enums";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import { getTaskView, taskAssignment, type TaskView } from "@/lib/data/tasks";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canChangeTaskStatus, canRecordMilestone } from "@/lib/permissions";
import { templateSnapshotJson } from "@/lib/snapshot";
import { parseLocalDateTime } from "@/lib/time";
import { hasPart, isPartCancelled, truncateToMinute } from "@/lib/turnaround";

// Bound arguments (task, milestone, status) come from the client, so each one is
// checked here against the database and the permission rules.

const t = messages.task;

async function loadTask(taskId: string): Promise<TaskView> {
  const task = await getTaskView(taskId);
  if (!task) throw new ActionError(messages.errors.notFound);
  return task;
}

/** Rule 6: a warning (never a block) when the saved time breaks the milestone order. */
function orderWarning(task: TaskView, milestoneId: string): string | undefined {
  const involved = new Set<string>();
  for (const row of task.timeline.rows) {
    if (row.milestone.id === milestoneId) row.orderConflictIds.forEach((id) => involved.add(id));
    else if (row.orderConflictIds.includes(milestoneId)) involved.add(row.milestone.id);
  }
  if (involved.size === 0) return undefined;
  const names = task.milestones.filter((m) => involved.has(m.id)).map((m) => m.name);
  return fmt(t.orderWarningSaved, { names: names.join(", ") });
}

async function saveMilestoneTime(taskId: string, milestoneId: string, time: Date): Promise<ActionResult> {
  const user = await actionUser();
  const task = await loadTask(taskId);
  const milestone = task.milestones.find((m) => m.id === milestoneId);
  if (!milestone) throw new ActionError(messages.errors.notFound);
  // Rule 11: the milestones of a missing part do not exist for this flight.
  if (!hasPart(task.timeline.kind, milestone.part)) throw new ActionError(messages.assignment.missingPart);
  // A cancelled part is not worked, so there is nothing to record on it.
  if (isPartCancelled(task.flight, milestone.part)) throw new ActionError(messages.delay.errors.cancelled);

  const existing = await prisma.milestoneRecord.findUnique({
    where: { taskId_milestoneDefinitionId: { taskId, milestoneDefinitionId: milestoneId } },
    select: { id: true, recordedById: true },
  });
  if (!canRecordMilestone(user, taskAssignment(task), milestone.part, existing)) {
    throw new ActionError(messages.errors.forbidden);
  }

  // Rule 10: minute precision, seconds cut off.
  const actualTime = truncateToMinute(time);
  try {
    await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.milestoneRecord.update({
          where: { id: existing.id },
          data: { actualTime, updatedById: user.id, updatedAt: new Date() },
        });
      } else {
        await tx.milestoneRecord.create({
          data: { taskId, milestoneDefinitionId: milestoneId, actualTime, recordedById: user.id },
        });
      }
      // The first recording starts the task.
      await tx.task.updateMany({ where: { id: taskId, status: "PLANNED" }, data: { status: "IN_PROGRESS" } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") throw new ActionError(t.conflict);
      if (error.code === "P2003") throw new ActionError(t.milestoneGone);
    }
    throw error;
  }

  refresh();
  return { ok: true, warning: orderWarning(await loadTask(taskId), milestoneId) };
}

export async function recordNow(taskId: string, milestoneId: string): Promise<ActionResult> {
  return runAction(() => saveMilestoneTime(taskId, milestoneId, new Date()));
}

export async function setMilestoneTime(
  taskId: string,
  milestoneId: string,
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const value = formData.get("time");
    const time = typeof value === "string" ? parseLocalDateTime(value) : null;
    if (!time) throw new ActionError(t.invalidTime);
    return saveMilestoneTime(taskId, milestoneId, time);
  });
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return Object.values(TaskStatus).includes(value as TaskStatus);
}

export async function changeStatus(
  taskId: string,
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const status = formData.get("status");
    if (!isTaskStatus(status)) throw new ActionError(messages.errors.invalidInput);
    const user = await actionUser();
    const task = await loadTask(taskId);
    if (!canChangeTaskStatus(user, taskAssignment(task))) throw new ActionError(messages.errors.forbidden);
    if (task.status === status) return;

    // Completing freezes the template; reopening goes back to the live template
    // (decision 2 in CLAUDE.md).
    const templateSnapshot =
      status === "COMPLETED"
        ? templateSnapshotJson({ ...task.params, milestones: task.milestones })
        : Prisma.DbNull;
    await prisma.task.update({ where: { id: taskId }, data: { status, templateSnapshot } });
    refresh();

    if (status === "COMPLETED") {
      const missing = task.timeline.rows.filter((r) => r.milestone.required && !r.actual);
      if (missing.length > 0) {
        return { ok: true, warning: fmt(t.missingOnComplete, { names: missing.map((r) => r.milestone.name).join(", ") }) };
      }
    }
  });
}
