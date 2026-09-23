"use server";

import { refresh } from "next/cache";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canPublishRoster } from "@/lib/permissions";
import { addDays, localDayRange, parseLocalDate, toLocalDate } from "@/lib/time";

const e = messages.publish.errors;

/**
 * Publishing a period (CLAUDE.md, "Beosztás rétegei"): the drafts of those days
 * become published and locked, and the actual layer is created as their copy.
 * A day may be published only once.
 */
export async function publishPeriod(_previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actionUser(canPublishRoster);

    const start = String(formData.get("start") ?? "");
    const end = String(formData.get("end") ?? "");
    if (!parseLocalDate(start) || !parseLocalDate(end)) throw new ActionError(e.date);
    if (end < start) throw new ActionError(e.endBeforeStart);

    const startDate = localDayRange(start).start;
    const endDate = localDayRange(end).start;

    const clash = await prisma.publication.findFirst({
      where: { startDate: { lte: endDate }, endDate: { gte: startDate } },
      select: { startDate: true, endDate: true },
    });
    if (clash) {
      throw new ActionError(
        fmt(e.alreadyPublished, { start: toLocalDate(clash.startDate), end: toLocalDate(clash.endDate) }),
      );
    }

    // A shift belongs to the day its first segment starts on.
    const drafts = await prisma.shift.findMany({
      where: {
        layer: "DRAFT",
        segments: { some: { start: { gte: localDayRange(addDays(start, -1)).start, lt: localDayRange(end).end } } },
      },
      include: { segments: true },
    });
    const inPeriod = drafts.filter((shift) => {
      const first = shift.segments.reduce<Date | null>((min, s) => (!min || s.start < min ? s.start : min), null);
      if (!first) return false;
      const day = toLocalDate(first);
      return day >= start && day <= end;
    });

    await prisma.$transaction(async (tx) => {
      const publication = await tx.publication.create({
        data: { startDate, endDate, publishedById: actor.id },
      });

      for (const shift of inPeriod) {
        await tx.shift.update({
          where: { id: shift.id },
          data: { layer: "PUBLISHED", publicationId: publication.id },
        });
        await tx.shift.create({
          data: {
            userId: shift.userId,
            layer: "ACTUAL",
            note: shift.note,
            segments: {
              create: shift.segments.map((segment) => ({
                start: segment.start,
                end: segment.end,
                segmentTypeId: segment.segmentTypeId,
                location: segment.location,
                description: segment.description,
                createBlock: segment.createBlock,
                travelBeforeMinutes: segment.travelBeforeMinutes,
                travelAfterMinutes: segment.travelAfterMinutes,
              })),
            },
          },
        });
      }
    });

    refresh();
    return inPeriod.length === 0 ? { ok: true, warning: messages.publish.nothingToPublish } : { ok: true };
  });
}
