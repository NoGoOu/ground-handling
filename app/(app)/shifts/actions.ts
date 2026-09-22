"use server";

import { refresh } from "next/cache";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import { listShiftsOfAgent } from "@/lib/data/shifts";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canManageShifts } from "@/lib/permissions";
import { formatDateTime } from "@/lib/time";
import { fieldErrors, formValues } from "@/lib/validation/form";
import { findOverlappingShift, SHIFT_FIELDS, shiftSchema, type ShiftData } from "@/lib/validation/shift";

const e = messages.shiftForm.errors;

/** Parses the form and checks the agent and the overlap rule. */
async function parseShift(formData: FormData, shiftId?: string): Promise<ShiftData> {
  const parsed = shiftSchema.safeParse(formValues(formData, SHIFT_FIELDS));
  if (!parsed.success) throw new ActionError(Object.values(fieldErrors(parsed.error))[0]);

  const agent = await prisma.user.findFirst({
    where: { id: parsed.data.userId, role: "AGENT", active: true },
    select: { id: true },
  });
  if (!agent) throw new ActionError(e.notAgent);

  // "Ugyanannak az embernek nem lehet két átfedő műszakja."
  const overlap = findOverlappingShift(await listShiftsOfAgent(agent.id), { ...parsed.data, id: shiftId });
  if (overlap) {
    throw new ActionError(
      fmt(e.overlap, { start: formatDateTime(overlap.startsAt), end: formatDateTime(overlap.endsAt) }),
    );
  }
  return parsed.data;
}

export async function createShift(_previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canManageShifts);
    await prisma.shift.create({ data: await parseShift(formData) });
    refresh();
  });
}

export async function updateShift(
  shiftId: string,
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canManageShifts);
    const existing = await prisma.shift.findUnique({ where: { id: shiftId }, select: { id: true } });
    if (!existing) throw new ActionError(messages.errors.notFound);
    await prisma.shift.update({ where: { id: shiftId }, data: await parseShift(formData, shiftId) });
    refresh();
  });
}

export async function deleteShift(shiftId: string): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canManageShifts);
    const existing = await prisma.shift.findUnique({ where: { id: shiftId }, select: { id: true } });
    if (!existing) throw new ActionError(messages.errors.notFound);
    await prisma.shift.delete({ where: { id: shiftId } });
    refresh();
  });
}
