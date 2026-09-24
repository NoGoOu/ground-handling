import type { TimeWindow } from "@/lib/turnaround";
import { metricsOf, positionStats, type PlanMetrics, type PositionStats } from "./balance";
import { compareWindows, sameWindows, windowId, type PlanWindow, type WindowPart } from "./input";
import { breakOf, shiftOf, violations, type Violation } from "./position";
import type { PlanningSettings } from "./settings";

// What the planner view shows of one plan day (CLAUDE.md, 4. mérföldkő,
// "Folyamat" 4): a lane per position with its shift, break and broken rules,
// the boxes of its windows as calculated, the indicators, and whether the day
// is stale. Pure; the data layer passes in the stored day.

export interface StoredPosition {
  id: string;
  number: number;
  userId: string | null;
  userName: string | null;
}

export interface StoredItem {
  id: string;
  positionId: string;
  taskId: string;
  part: WindowPart;
  start: Date;
  end: Date;
  manual: boolean;
}

/** What a box shows of its task; missing when the task is gone. */
export interface TaskLabel {
  flightLabel: string;
  stand: string;
}

export interface PlanBox extends TimeWindow {
  /** The stored item, the handle for a move. */
  itemId: string;
  windowId: string;
  taskId: string;
  part: WindowPart;
  flightLabel: string;
  stand: string;
  manual: boolean;
}

export interface PlanLane {
  positionId: string;
  number: number;
  userId: string | null;
  userName: string | null;
  shift: TimeWindow;
  break: TimeWindow | null;
  violations: Violation[];
  stats: PositionStats;
  boxes: PlanBox[];
}

export interface PlanDayView {
  lanes: PlanLane[];
  metrics: PlanMetrics;
  /** The windows of the tasks changed since the calculation. */
  stale: boolean;
  hasManual: boolean;
}

export function itemWindow(item: StoredItem): PlanWindow {
  return { id: windowId(item.taskId, item.part), taskId: item.taskId, part: item.part, start: item.start, end: item.end };
}

export function planDayView({
  positions,
  items,
  settings,
  labels,
  current,
}: {
  positions: readonly StoredPosition[];
  items: readonly StoredItem[];
  settings: PlanningSettings;
  labels: ReadonlyMap<string, TaskLabel>;
  /** Today's windows of the day, to tell a stale plan. */
  current: readonly PlanWindow[];
}): PlanDayView {
  const lanes: PlanLane[] = [];
  for (const position of [...positions].sort((a, b) => a.number - b.number)) {
    const own = items.filter((item) => item.positionId === position.id);
    if (own.length === 0) continue;
    const windows = own.map(itemWindow).sort(compareWindows);
    const boxes = own
      .map((item) => {
        const label = labels.get(item.taskId);
        return {
          itemId: item.id,
          windowId: windowId(item.taskId, item.part),
          taskId: item.taskId,
          part: item.part,
          start: item.start,
          end: item.end,
          flightLabel: label?.flightLabel ?? "?",
          stand: label?.stand ?? "–",
          manual: item.manual,
        };
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime() || (a.windowId < b.windowId ? -1 : 1));
    lanes.push({
      positionId: position.id,
      number: position.number,
      userId: position.userId,
      userName: position.userName,
      shift: shiftOf(windows, settings)!,
      break: breakOf(windows, settings),
      violations: violations(windows, settings),
      stats: positionStats(windows, settings),
      boxes,
    });
  }
  const perLane = lanes.map((lane) => lane.boxes.map((box) => itemWindow({ ...box, id: box.itemId, positionId: lane.positionId })));
  return {
    lanes,
    metrics: metricsOf(perLane, settings),
    stale: !sameWindows(items.map(itemWindow), current),
    hasManual: items.some((item) => item.manual),
  };
}
