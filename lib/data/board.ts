import { buildBoard, type Board, type BoardBox, type BoardTask } from "@/lib/board";
import { listShiftsForDay } from "@/lib/data/shifts";
import { listTaskViewsForDay, type TaskView } from "@/lib/data/tasks";
import { describeShortfalls, loadQualificationContext } from "@/lib/data/training";
import { listAgentOptions } from "@/lib/data/users";
import { flightLabel } from "@/lib/flight";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { shortfalls, windowRequirement } from "@/lib/qualifications";
import { formatDayShort, formatTime, toLocalDate } from "@/lib/time";

function toBoardTask(task: TaskView): BoardTask {
  return {
    id: task.id,
    flightId: task.flight.id,
    taskTypeCode: task.taskType.code,
    flightLabel: flightLabel(task.flight),
    stand: task.flight.stand ?? messages.flightForm.none,
    status: task.status,
    late: task.late.scheduled
      ? fmt(messages.late.scheduled, {
          time: `${formatDayShort(toLocalDate(task.late.scheduled))} ${formatTime(task.late.scheduled)}`,
        })
      : null,
    type: task.timeline.shape.type,
    arrivalAgentId: task.arrivalAgent?.id ?? null,
    departureAgentId: task.effectiveDepartureAgent?.id ?? null,
    windows: task.timeline.shape.windows,
  };
}

/** The band view of one Budapest day: lanes, boxes and conflicts. */
export async function getBoardForDay(localDate: string): Promise<Board> {
  const [tasks, shifts] = await Promise.all([listTaskViewsForDay(localDate), listShiftsForDay(localDate, "ACTUAL")]);
  const agents = await listAgentOptions([
    ...tasks.flatMap((task) => [task.arrivalAgent?.id ?? null, task.departureAgent?.id ?? null]),
    ...shifts.map((shift) => shift.user.id),
  ]);

  // The qualifications each box needs, against its lane's agent (6. mérföldkő).
  const context = await loadQualificationContext(agents.map((agent) => agent.id));
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const qualificationGaps = (box: BoardBox, agentId: string) => {
    const task = byId.get(box.taskId);
    if (!task) return null;
    const required = windowRequirement(context.requirementsOf(task.flight.airlineId, task.taskType.id), box.part);
    const missing = shortfalls(required, context.recordsOf(agentId), toLocalDate(box.start));
    return missing.length > 0 ? describeShortfalls(missing, context.codeOf) : null;
  };

  // Lanes come from the actual roster: operative segments are working time,
  // non-operative ones may cast a block.
  return buildBoard({
    qualificationGaps,
    tasks: tasks.map(toBoardTask),
    segments: shifts.flatMap((shift) =>
      shift.segments.map((segment) => ({
        id: segment.id,
        userId: shift.user.id,
        start: segment.start,
        end: segment.end,
        typeName: segment.type.name,
        operative: segment.type.operative,
        createBlock: segment.createBlock,
        travelBeforeMinutes: segment.travelBeforeMinutes,
        travelAfterMinutes: segment.travelAfterMinutes,
        location: segment.location,
        description: segment.description,
      })),
    ),
    agents,
  });
}

/** The conflicts of a box as one line; a missing qualification is named (6. mérföldkő). */
export function describeBoxConflicts(box: Pick<BoardBox, "conflicts" | "qualificationGaps">): string {
  return box.conflicts
    .map((kind) =>
      kind === "QUALIFICATION" && box.qualificationGaps
        ? fmt(messages.board.qualificationConflict, { list: box.qualificationGaps })
        : messages.board.conflicts[kind],
    )
    .join(", ");
}
