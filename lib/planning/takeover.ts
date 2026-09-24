import type { Part, TurnaroundType } from "@/lib/turnaround";
import type { WindowPart } from "./input";

// "Kiosztás átvétele" (CLAUDE.md, 4. mérföldkő): the plan's agents go onto the
// tasks, but only onto parts nobody works yet; the assigned ones are skipped
// and listed. A quick turnaround is one piece of work, both parts go to the
// same agent (rule 8). The task's current shape counts, so a stale plan still
// lands right: a window of a turnaround that has since turned quick or long
// sets the parts the task has now. Pure; the action loads and writes.

export interface TakeoverItem {
  taskId: string;
  part: WindowPart;
  /** The agent named for the item's position. */
  agentId: string | null;
}

export interface TakeoverTask {
  id: string;
  flightLabel: string;
  /** Now: null on a one-sided flight. */
  type: TurnaroundType | null;
  /** The parts still worked: existing and not cancelled. */
  activeParts: readonly Part[];
  arrivalAgentId: string | null;
  departureAgentId: string | null;
}

export type SkipReason = "assigned" | "unnamed" | "notWorked" | "gone" | "outOfScope";

export interface TakeoverResult {
  updates: { taskId: string; arrivalAgentId: string | null; departureAgentId: string | null }[];
  assigned: { taskId: string; flightLabel: string; part: Part | "WHOLE"; agentId: string }[];
  skipped: { taskId: string; flightLabel: string; part: WindowPart; reason: SkipReason; agentId: string | null }[];
}

const PART_ORDER: Record<WindowPart, number> = { WHOLE: 0, ARRIVAL_PART: 1, DEPARTURE_PART: 2 };

export function takeOver(
  items: readonly TakeoverItem[],
  tasks: ReadonlyMap<string, TakeoverTask>,
  /** Whether the actor may give this task to this agent (scope). */
  mayAssign: (task: TakeoverTask, agentId: string) => boolean,
): TakeoverResult {
  const state = new Map<string, { arrival: string | null; departure: string | null }>();
  const result: TakeoverResult = { updates: [], assigned: [], skipped: [] };
  const sorted = [...items].sort(
    (a, b) => (a.taskId < b.taskId ? -1 : a.taskId > b.taskId ? 1 : PART_ORDER[a.part] - PART_ORDER[b.part]),
  );

  for (const item of sorted) {
    const task = tasks.get(item.taskId);
    const skip = (reason: SkipReason, part: WindowPart = item.part, agentId: string | null = item.agentId) =>
      result.skipped.push({ taskId: item.taskId, flightLabel: task?.flightLabel ?? "?", part, reason, agentId });
    if (!task) {
      skip("gone");
      continue;
    }
    if (!item.agentId) {
      skip("unnamed");
      continue;
    }
    if (!mayAssign(task, item.agentId)) {
      skip("outOfScope");
      continue;
    }
    const current = state.get(task.id) ?? { arrival: task.arrivalAgentId, departure: task.departureAgentId };
    state.set(task.id, current);

    if (task.type === "QUICK") {
      // One piece of work: the arrival agent does both parts.
      if (current.arrival) {
        skip("assigned", item.part, current.arrival);
        continue;
      }
      current.arrival = item.agentId;
      current.departure ??= item.agentId;
      result.assigned.push({ taskId: task.id, flightLabel: task.flightLabel, part: "WHOLE", agentId: item.agentId });
      continue;
    }

    const parts: Part[] = item.part === "WHOLE" ? ["ARRIVAL_PART", "DEPARTURE_PART"] : [item.part];
    for (const part of parts) {
      if (!task.activeParts.includes(part)) {
        skip("notWorked", part);
        continue;
      }
      const key = part === "ARRIVAL_PART" ? "arrival" : "departure";
      if (current[key]) {
        skip("assigned", part, current[key]);
        continue;
      }
      current[key] = item.agentId;
      result.assigned.push({ taskId: task.id, flightLabel: task.flightLabel, part, agentId: item.agentId });
    }
  }

  for (const [taskId, current] of state) {
    const task = tasks.get(taskId)!;
    if (current.arrival !== task.arrivalAgentId || current.departure !== task.departureAgentId) {
      result.updates.push({ taskId, arrivalAgentId: current.arrival, departureAgentId: current.departure });
    }
  }
  return result;
}
