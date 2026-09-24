import { buildBoard, type Board, type BoardTask } from "@/lib/board";
import { listShiftsForDay } from "@/lib/data/shifts";
import { listTaskViewsForDay, type TaskView } from "@/lib/data/tasks";
import { listAgentOptions } from "@/lib/data/users";
import { flightLabel } from "@/lib/flight";

function toBoardTask(task: TaskView): BoardTask {
  return {
    id: task.id,
    flightLabel: flightLabel(task.flight),
    stand: task.flight.stand,
    status: task.status,
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

  // Lanes come from the actual roster: operative segments are working time,
  // non-operative ones may cast a block.
  return buildBoard({
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
