import type { Prisma, RosterLayer } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { addDays, localDayRange, toLocalDate } from "@/lib/time";

// The roster lives in three layers (CLAUDE.md, "Beosztás rétegei"). A shift has
// no start and end of its own: they come from its segments.

const shiftInclude = {
  user: { select: { id: true, name: true, active: true } },
  segments: { include: { segmentType: true }, orderBy: { start: "asc" } },
} satisfies Prisma.ShiftInclude;

type ShiftWithRelations = Prisma.ShiftGetPayload<{ include: typeof shiftInclude }>;

export interface RosterSegment {
  id: string;
  start: Date;
  end: Date;
  type: { id: string; name: string; code: string; operative: boolean };
  location: string | null;
  description: string | null;
  createBlock: boolean;
  travelBeforeMinutes: number;
  travelAfterMinutes: number;
}

export interface RosterShift {
  id: string;
  layer: RosterLayer;
  publicationId: string | null;
  note: string | null;
  user: { id: string; name: string; active: boolean };
  segments: RosterSegment[];
  /** Earliest segment start and latest segment end. */
  start: Date | null;
  end: Date | null;
}

export function toRosterShift(shift: ShiftWithRelations): RosterShift {
  const segments: RosterSegment[] = shift.segments.map((segment) => ({
    id: segment.id,
    start: segment.start,
    end: segment.end,
    type: {
      id: segment.segmentType.id,
      name: segment.segmentType.name,
      code: segment.segmentType.code,
      operative: segment.segmentType.operative,
    },
    location: segment.location,
    description: segment.description,
    createBlock: segment.createBlock,
    travelBeforeMinutes: segment.travelBeforeMinutes,
    travelAfterMinutes: segment.travelAfterMinutes,
  }));

  return {
    id: shift.id,
    layer: shift.layer,
    publicationId: shift.publicationId,
    note: shift.note,
    user: shift.user,
    segments,
    start: segments[0]?.start ?? null,
    end: segments.reduce<Date | null>((latest, s) => (!latest || s.end > latest ? s.end : latest), null),
  };
}

/** Shifts of one layer with a segment overlapping the given Budapest day. */
export async function listShiftsForDay(localDate: string, layer: RosterLayer): Promise<RosterShift[]> {
  const { start, end } = localDayRange(localDate);
  const shifts = await prisma.shift.findMany({
    where: { layer, segments: { some: { start: { lt: end }, end: { gt: start } } } },
    include: shiftInclude,
    orderBy: [{ user: { name: "asc" } }],
  });
  return shifts.map(toRosterShift);
}

/** Every shift of one agent in one layer, for the overlap check. */
export async function listShiftsOfAgent(userId: string, layer: RosterLayer): Promise<RosterShift[]> {
  const shifts = await prisma.shift.findMany({ where: { userId, layer }, include: shiftInclude });
  return shifts.map(toRosterShift);
}

export async function listSegmentTypes(onlyActive = false) {
  return prisma.segmentType.findMany({
    where: onlyActive ? { active: true } : undefined,
    orderBy: [{ operative: "desc" }, { name: "asc" }],
  });
}

/** Active agents (team members) whose roster the actor may read. */
export async function listRosterAgents(userIds: string[] | null) {
  return prisma.user.findMany({
    where: { active: true, teamId: { not: null }, ...(userIds ? { id: { in: userIds } } : {}) },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Shifts of a period for the roster table. A shift belongs to the day its first
 * segment starts on, so the query reaches one day back and filters afterwards.
 */
export async function listShiftsInRange({
  startLocalDate,
  days,
  layers,
  userIds,
}: {
  startLocalDate: string;
  days: number;
  layers: RosterLayer[];
  userIds: string[] | null;
}): Promise<RosterShift[]> {
  const from = localDayRange(addDays(startLocalDate, -1)).start;
  const to = localDayRange(addDays(startLocalDate, days - 1)).end;
  const shifts = await prisma.shift.findMany({
    where: {
      layer: { in: layers },
      ...(userIds ? { userId: { in: userIds } } : {}),
      segments: { some: { start: { gte: from, lt: to } } },
    },
    include: shiftInclude,
    orderBy: [{ user: { name: "asc" } }],
  });
  const first = startLocalDate;
  const last = addDays(startLocalDate, days - 1);
  return shifts.map(toRosterShift).filter((shift) => {
    if (!shift.start) return false;
    const day = toLocalDate(shift.start);
    return day >= first && day <= last;
  });
}

/** Every layer of one agent's shifts that start on the given day. */
export async function getCellShifts(userId: string, localDate: string): Promise<RosterShift[]> {
  const { start, end } = localDayRange(localDate);
  const shifts = await prisma.shift.findMany({
    where: { userId, segments: { some: { start: { gte: localDayRange(addDays(localDate, -1)).start, lt: end } } } },
    include: shiftInclude,
  });
  return shifts.map(toRosterShift).filter((shift) => shift.start && shift.start >= start && shift.start < end);
}
