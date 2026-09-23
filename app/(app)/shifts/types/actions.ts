"use server";

import { refresh } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { canManageSegmentTypes } from "@/lib/permissions";
import { segmentTypeSchema } from "@/lib/validation/segment-type";
import { fieldErrors } from "@/lib/validation/form";

const e = messages.segmentTypeForm.errors;

function parseSegmentType(formData: FormData) {
  const parsed = segmentTypeSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    code: String(formData.get("code") ?? ""),
    operative: formData.get("operative") !== null,
    active: formData.get("active") !== null,
  });
  if (!parsed.success) throw new ActionError(Object.values(fieldErrors(parsed.error))[0] ?? messages.errors.invalidInput);
  return parsed.data;
}

/** Both the name and the code are unique; say which one clashed. */
async function assertUnique(data: { name: string; code: string }, segmentTypeId: string | null) {
  const clash = await prisma.segmentType.findFirst({
    where: {
      OR: [{ name: data.name }, { code: data.code }],
      ...(segmentTypeId ? { id: { not: segmentTypeId } } : {}),
    },
    select: { name: true, code: true },
  });
  if (clash) throw new ActionError(clash.code === data.code ? e.codeTaken : e.nameTaken);
}

/** Fallback for the race between the check above and the write. */
function uniqueError(error: unknown): ActionError | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return null;
  const target = String((error.meta as { target?: string | string[] } | undefined)?.target ?? "");
  return new ActionError(target.includes("name") ? e.nameTaken : e.codeTaken);
}

export async function createSegmentType(_previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canManageSegmentTypes);
    const data = parseSegmentType(formData);
    await assertUnique(data, null);
    try {
      await prisma.segmentType.create({ data });
    } catch (error) {
      throw uniqueError(error) ?? error;
    }
    refresh();
  });
}

export async function updateSegmentType(
  segmentTypeId: string,
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canManageSegmentTypes);
    const existing = await prisma.segmentType.findUnique({ where: { id: segmentTypeId }, select: { id: true } });
    if (!existing) throw new ActionError(e.notFound);

    const data = parseSegmentType(formData);
    await assertUnique(data, segmentTypeId);
    try {
      await prisma.segmentType.update({ where: { id: segmentTypeId }, data });
    } catch (error) {
      throw uniqueError(error) ?? error;
    }
    refresh();
  });
}
