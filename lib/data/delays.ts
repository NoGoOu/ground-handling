import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";

// Delay codes and the delay records of a flight's departure part (CLAUDE.md,
// 7. mérföldkő, "Késéskód"). The records of the newest departure MVT come
// from the message (lib/data/messages.ts); these are the ones by hand.

export async function listDelayCodes(onlyActive = false) {
  return prisma.delayCode.findMany({ where: onlyActive ? { active: true } : {}, orderBy: { code: "asc" } });
}

export async function listDelayRecords(flightId: string) {
  return prisma.delayRecord.findMany({
    where: { flightId },
    include: { createdBy: { select: { name: true } } },
    orderBy: [{ source: "asc" }, { createdAt: "asc" }],
  });
}

export type DelayRecordRow = Awaited<ReturnType<typeof listDelayRecords>>[number];

/** Adds a record by hand and logs it; false when the departure part is missing or cancelled (rule 17). */
export async function addDelayRecord(flightId: string, code: string, minutes: number, userId: string): Promise<boolean> {
  const flight = await prisma.flight.findUnique({ where: { id: flightId }, select: { std: true, departureCancelled: true } });
  if (!flight?.std || flight.departureCancelled) return false;
  await prisma.$transaction([
    prisma.delayRecord.create({ data: { flightId, code, minutes, source: "MANUAL", createdById: userId, updatedById: userId } }),
    prisma.flightEvent.create({
      data: {
        flightId,
        kind: "DELAY_CODES",
        part: "DEPARTURE_PART",
        note: fmt(messages.delayRecords.logAdd, { code, minutes }),
        createdById: userId,
      },
    }),
  ]);
  return true;
}

/** Removes a record made by hand and logs it; one from a message goes only with a newer message. */
export async function removeDelayRecord(recordId: string, userId: string): Promise<{ flightId: string } | null> {
  const record = await prisma.delayRecord.findUnique({ where: { id: recordId } });
  if (!record || record.source !== "MANUAL") return null;
  await prisma.$transaction([
    prisma.delayRecord.delete({ where: { id: recordId } }),
    prisma.flightEvent.create({
      data: {
        flightId: record.flightId,
        kind: "DELAY_CODES",
        part: "DEPARTURE_PART",
        note: fmt(messages.delayRecords.logRemove, { code: record.code, minutes: record.minutes }),
        createdById: userId,
      },
    }),
  ]);
  return { flightId: record.flightId };
}
