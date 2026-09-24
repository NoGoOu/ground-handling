import { describe, expect, it } from "vitest";
import { windowId, type PlanWindow } from "@/lib/planning/input";
import { DEFAULT_PLANNING_SETTINGS } from "@/lib/planning/settings";
import { planDayView, type StoredItem, type StoredPosition } from "@/lib/planning/view";

const DAY = Date.UTC(2026, 8, 24, 4, 0);
const at = (minute: number) => new Date(DAY + minute * 60_000);
const item = (id: string, positionId: string, from: number, to: number, manual = false): StoredItem => ({
  id,
  positionId,
  taskId: `task-${id}`,
  part: "WHOLE",
  start: at(from),
  end: at(to),
  manual,
});
const asWindow = (i: StoredItem): PlanWindow => ({
  id: windowId(i.taskId, i.part),
  taskId: i.taskId,
  part: i.part,
  start: i.start,
  end: i.end,
});

const positions: StoredPosition[] = [
  { id: "p2", number: 2, userId: null, userName: null },
  { id: "p1", number: 1, userId: "u1", userName: "Kiss Péter" },
  { id: "p3", number: 3, userId: null, userName: null },
];
const items = [item("a", "p1", 0, 45), item("b", "p1", 100, 145), item("c", "p2", 30, 75, true)];
const labels = new Map([
  ["task-a", { flightLabel: "FR1 / FR2", stand: "12" }],
  ["task-c", { flightLabel: "FR5", stand: "–" }],
]);

describe("the view of a plan day", () => {
  const view = planDayView({
    positions,
    items,
    settings: DEFAULT_PLANNING_SETTINGS,
    labels,
    current: items.map(asWindow),
  });

  it("gives a lane per position with windows, in number order", () => {
    expect(view.lanes.map((lane) => lane.number)).toEqual([1, 2]);
    expect(view.lanes[0].userName).toBe("Kiss Péter");
    expect(view.lanes[0].boxes.map((box) => box.flightLabel)).toEqual(["FR1 / FR2", "?"]);
  });

  it("shows the shift pushed out to the minimum, and the load", () => {
    expect(view.lanes[0].shift).toEqual({ start: at(0), end: at(240) });
    expect(view.lanes[0].stats).toEqual({ busyMinutes: 90, shiftMinutes: 240, idleMinutes: 150 });
    expect(view.metrics.positions).toBe(2);
    expect(view.metrics.loadSpread).toBe(45);
  });

  it("marks manual moves, and a fresh day", () => {
    expect(view.lanes[1].boxes[0].manual).toBe(true);
    expect(view.hasManual).toBe(true);
    expect(view.stale).toBe(false);
  });

  it("tells a stale day when the windows changed", () => {
    const moved = items.map((i) => (i.id === "a" ? { ...asWindow(i), start: at(5) } : asWindow(i)));
    expect(planDayView({ positions, items, settings: DEFAULT_PLANNING_SETTINGS, labels, current: moved }).stale).toBe(true);
  });

  it("lists the rules a manual move broke", () => {
    const overlapping = [...items, item("d", "p1", 20, 60, true)];
    const lane = planDayView({
      positions,
      items: overlapping,
      settings: DEFAULT_PLANNING_SETTINGS,
      labels,
      current: overlapping.map(asWindow),
    }).lanes[0];
    expect(lane.violations).toEqual(["OVERLAP"]);
  });
});
