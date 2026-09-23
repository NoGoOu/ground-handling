import type { Prisma, RosterLayer } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { localDayRange } from "@/lib/time";

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
