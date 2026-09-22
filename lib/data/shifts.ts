import { prisma } from "@/lib/db";
import { localDayRange } from "@/lib/time";

const shiftInclude = { user: { select: { id: true, name: true, active: true } } } as const;

export interface ShiftView {
  id: string;
  startsAt: Date;
  endsAt: Date;
  note: string | null;
  user: { id: string; name: string; active: boolean };
  /** Half-open window, for the overlap rules. */
  start: Date;
  end: Date;
}

function toShiftView(shift: {
  id: string;
  startsAt: Date;
  endsAt: Date;
  note: string | null;
  user: { id: string; name: string; active: boolean };
}): ShiftView {
  return { ...shift, start: shift.startsAt, end: shift.endsAt };
}

/** Shifts that overlap the given Budapest day, ordered by agent and start. */
export async function listShiftsForDay(localDate: string): Promise<ShiftView[]> {
  const { start, end } = localDayRange(localDate);
  const shifts = await prisma.shift.findMany({
    where: { startsAt: { lt: end }, endsAt: { gt: start } },
    include: shiftInclude,
    orderBy: [{ user: { name: "asc" } }, { startsAt: "asc" }],
  });
  return shifts.map(toShiftView);
}

/** Every shift of one agent, for the overlap check. */
export async function listShiftsOfAgent(userId: string): Promise<ShiftView[]> {
  const shifts = await prisma.shift.findMany({
    where: { userId },
    include: shiftInclude,
    orderBy: { startsAt: "asc" },
  });
  return shifts.map(toShiftView);
}
