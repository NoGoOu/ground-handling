import { buildBoard, type Board, type BoardTask } from "@/lib/board";
import { listShiftsForDay } from "@/lib/data/shifts";
import { listTaskViewsForDay, type TaskView } from "@/lib/data/tasks";
import { listAgentOptions } from "@/lib/data/users";

function toBoardTask(task: TaskView): BoardTask {
  return {
    id: task.id,
    flightLabel: `${task.flight.inboundFlightNumber} / ${task.flight.outboundFlightNumber}`,
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
  const [tasks, shifts] = await Promise.all([listTaskViewsForDay(localDate), listShiftsForDay(localDate)]);
  const agents = await listAgentOptions([
    ...tasks.flatMap((task) => [task.arrivalAgent?.id ?? null, task.departureAgent?.id ?? null]),
    ...shifts.map((shift) => shift.user.id),
  ]);

  return buildBoard({
    tasks: tasks.map(toBoardTask),
    shifts: shifts.map((shift) => ({
      id: shift.id,
      userId: shift.user.id,
      start: shift.startsAt,
      end: shift.endsAt,
    })),
    agents,
  });
}
