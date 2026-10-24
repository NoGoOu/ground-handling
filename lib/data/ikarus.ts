import type { Prisma } from "@/generated/prisma/client";
import { BASE_TASK_TYPE } from "@/lib/data/task-types";
import { prisma } from "@/lib/db";
import { DEMO_MILESTONES, DEMO_TEMPLATE_PARAMS } from "@/lib/demo-template";
import { IKARUS_PROFILE, type LiveState } from "@/lib/ikarus/convert";
import { BUILT_IN_ADMIN_ROLE } from "@/lib/permissions";

// The database side of the Ikarus import (CLAUDE.md, "Közbeiktatva: valós
// járatok az Ikarus-mentésből"), for scripts/ikarus-import.ts. Only on a
// development or demo instance: the script refuses in production.

/** Its flights are the ones with an AODB id. */
export const IKARUS_FLIGHTS: Prisma.FlightWhereInput = {
  OR: [{ arrivalAodbId: { not: null } }, { departureAodbId: { not: null } }],
};

/** The "Ikarus" import profile: no column mapping, so the file import never offers it. */
export async function ikarusProfileId(userId: string | null): Promise<string | null> {
  const found = await prisma.importProfile.findUnique({ where: { name: IKARUS_PROFILE }, select: { id: true } });
  if (found || !userId) return found?.id ?? null;
  const created = await prisma.importProfile.create({
    data: { name: IKARUS_PROFILE, headerFingerprint: "ikarus", mapping: {}, createdById: userId },
    select: { id: true },
  });
  return created.id;
}

/**
 * An airline for each code not in the system yet: the code as its name, the
 * "Alap" task type with the demo template as its only, primary one, and the
 * Ikarus-import mark, so "remove" can take it away again.
 */
export async function createIkarusAirlines(codes: readonly string[]): Promise<number> {
  if (codes.length === 0) return 0;
  const existing = new Set((await prisma.airline.findMany({ where: { iataCode: { in: [...codes] } }, select: { iataCode: true } })).map((a) => a.iataCode));
  const missing = codes.filter((code) => !existing.has(code));
  if (missing.length === 0) return 0;
  const taskType = await prisma.taskType.findUniqueOrThrow({ where: { code: BASE_TASK_TYPE.code }, select: { id: true } });
  await prisma.$transaction(async (tx) => {
    for (const code of missing) {
      const airline = await tx.airline.create({ data: { name: code, iataCode: code, ikarusImport: true }, select: { id: true } });
      const template = await tx.turnaroundTemplate.create({
        data: { name: "Demo", ...DEMO_TEMPLATE_PARAMS, airlineId: airline.id, taskTypeId: taskType.id, milestones: { create: DEMO_MILESTONES } },
        select: { id: true },
      });
      await tx.airlineTaskType.create({ data: { airlineId: airline.id, taskTypeId: taskType.id, templateId: template.id, isPrimary: true } });
    }
  });
  return missing.length;
}

/** What the flights have now of the fields the import writes besides the schedule. */
export async function loadLiveStates(flightIds: readonly string[]): Promise<Map<string, LiveState>> {
  const flights = await prisma.flight.findMany({
    where: { id: { in: [...flightIds] } },
    select: {
      id: true,
      stand: true,
      eta: true,
      etaSource: true,
      etaRecordedAt: true,
      etd: true,
      etdSource: true,
      etdRecordedAt: true,
      ata: true,
      atd: true,
      arrivalAodbId: true,
      departureAodbId: true,
      // An actual from a message leaves a log entry with the message.
      events: { where: { kind: "ACTUAL", messageId: { not: null } }, select: { ata: true, atd: true } },
    },
  });
  return new Map(
    flights.map(({ id, events, ...flight }) => [
      id,
      { ...flight, arrivalActualFromMessage: events.some((e) => !!e.ata), departureActualFromMessage: events.some((e) => !!e.atd) },
    ]),
  );
}

/** The first active user with the Admin role, for the import log when no user is given. */
export async function defaultImportUser(username: string | null): Promise<{ id: string; username: string } | null> {
  if (username) return prisma.user.findFirst({ where: { username, active: true }, select: { id: true, username: true } });
  return prisma.user.findFirst({
    where: { active: true, roles: { some: { role: { name: BUILT_IN_ADMIN_ROLE, builtIn: true } } } },
    orderBy: { createdAt: "asc" },
    select: { id: true, username: true },
  });
}

export type RemoveResult =
  | { ok: true; flights: number; airlines: number; messages: number }
  | { ok: false; practicalExams: number };

/**
 * Takes the Ikarus flights away, with their tasks and what hangs on them
 * (records, plan items, trainee sessions, log, delay codes), and the airlines
 * the import made, once they have no flight left. Messages paired with the
 * flights become unmatched, not deleted. A practical exam on one of their
 * tasks is a training record: then nothing is removed.
 */
export async function removeIkarusData(): Promise<RemoveResult> {
  const practicalExams = await prisma.practicalExam.count({ where: { task: { flight: IKARUS_FLIGHTS } } });
  if (practicalExams > 0) return { ok: false, practicalExams };
  return prisma.$transaction(
    async (tx) => {
      const messages = await tx.message.updateMany({
        where: { flight: IKARUS_FLIGHTS },
        data: { flightId: null, part: null, current: false },
      });
      const flights = await tx.flight.deleteMany({ where: IKARUS_FLIGHTS });
      const airlines = await tx.airline.findMany({ where: { ikarusImport: true, flights: { none: {} } }, select: { id: true } });
      const airlineIds = airlines.map((a) => a.id);
      if (airlineIds.length > 0) {
        await tx.airlineTaskType.deleteMany({ where: { airlineId: { in: airlineIds } } });
        await tx.milestoneDefinition.deleteMany({ where: { template: { airlineId: { in: airlineIds } } } });
        await tx.turnaroundTemplate.deleteMany({ where: { airlineId: { in: airlineIds } } });
        await tx.airline.deleteMany({ where: { id: { in: airlineIds } } });
      }
      return { ok: true as const, flights: flights.count, airlines: airlineIds.length, messages: messages.count };
    },
    { timeout: 120_000, maxWait: 10_000 },
  );
}
