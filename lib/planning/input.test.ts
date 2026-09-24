import { describe, expect, it } from "vitest";
import { DEMO_MILESTONES, DEMO_TEMPLATE_PARAMS } from "@/lib/demo-template";
import { sameWindows, windowsOfDay, type PlanningTask } from "@/lib/planning/input";
import { computeTimeline, type FlightTimes, type MilestoneDef } from "@/lib/turnaround";

// The input of the plan: the occupancy windows of the tasks, by the Budapest
// day they start on (CLAUDE.md, 4. mérföldkő, "Folyamat" 2).

const milestones: MilestoneDef[] = DEMO_MILESTONES.map((m) => ({ ...m, id: m.code }));
/** Budapest is UTC+2 in September. */
const at = (day: string, hhmm: string) => new Date(`2026-09-${day}T${hhmm}:00Z`);

function task(id: string, flight: FlightTimes): PlanningTask {
  const timeline = computeTimeline({ flight, params: DEMO_TEMPLATE_PARAMS, milestones, recorded: new Map() });
  return { id, windows: timeline.shape.windows };
}

describe("the windows of a day", () => {
  it("gives a quick turnaround one window", () => {
    const windows = windowsOfDay([task("q", { sta: at("24", "08:00"), std: at("24", "08:25") })], "2026-09-24");
    expect(windows).toEqual([{ id: "q:WHOLE", taskId: "q", part: "WHOLE", start: at("24", "07:55"), end: at("24", "08:40") }]);
  });

  it("gives a long turnaround two windows, each a task of its own", () => {
    const windows = windowsOfDay([task("l", { sta: at("24", "08:00"), std: at("24", "11:00") })], "2026-09-24");
    expect(windows.map((w) => w.id)).toEqual(["l:ARRIVAL_PART", "l:DEPARTURE_PART"]);
    expect(windows[0]).toMatchObject({ start: at("24", "07:55"), end: at("24", "08:15") });
    expect(windows[1]).toMatchObject({ start: at("24", "10:15"), end: at("24", "11:15") });
  });

  it("gives a one-sided flight one window", () => {
    const tasks = [task("a", { sta: at("24", "08:00"), std: null }), task("d", { sta: null, std: at("24", "12:00") })];
    expect(windowsOfDay(tasks, "2026-09-24").map((w) => w.id)).toEqual(["a:ARRIVAL_PART", "d:DEPARTURE_PART"]);
  });

  it("leaves out a cancelled part, and a flight cancelled as a whole", () => {
    const tasks = [
      task("l", { sta: at("24", "08:00"), std: at("24", "11:00"), arrivalCancelled: true }),
      task("x", { sta: at("24", "09:00"), std: at("24", "09:25"), arrivalCancelled: true, departureCancelled: true }),
    ];
    expect(windowsOfDay(tasks, "2026-09-24").map((w) => w.id)).toEqual(["l:DEPARTURE_PART"]);
  });

  it("puts the windows of a turnaround over midnight on the day each one starts", () => {
    // Arrival 23:30 in Budapest (21:30 UTC), departure 06:00 next morning (04:00 UTC).
    const night = task("n", { sta: at("24", "21:30"), std: at("25", "04:00") });
    expect(windowsOfDay([night], "2026-09-24").map((w) => w.id)).toEqual(["n:ARRIVAL_PART"]);
    expect(windowsOfDay([night], "2026-09-25").map((w) => w.id)).toEqual(["n:DEPARTURE_PART"]);
  });

  it("keeps a window that starts before midnight on that day, even if it ends after", () => {
    // Quick turnaround at 23:55 Budapest: the window runs 23:50–00:35.
    const late = task("z", { sta: at("24", "21:55"), std: at("24", "22:20") });
    expect(windowsOfDay([late], "2026-09-24").map((w) => w.id)).toEqual(["z:WHOLE"]);
    expect(windowsOfDay([late], "2026-09-25")).toEqual([]);
  });

  it("orders by start, then end, then id", () => {
    const tasks = [
      task("b", { sta: at("24", "08:00"), std: at("24", "08:25") }),
      task("a", { sta: at("24", "08:00"), std: at("24", "08:25") }),
      task("c", { sta: at("24", "07:00"), std: null }),
    ];
    expect(windowsOfDay(tasks, "2026-09-24").map((w) => w.taskId)).toEqual(["c", "a", "b"]);
  });
});

describe("a stale plan day", () => {
  const before = windowsOfDay([task("q", { sta: at("24", "08:00"), std: at("24", "08:25") })], "2026-09-24");

  it("is fresh while the windows are the same, in any order", () => {
    const other = windowsOfDay([task("p", { sta: at("24", "09:00"), std: at("24", "09:25") })], "2026-09-24");
    expect(sameWindows([...before, ...other], [...other, ...before])).toBe(true);
  });

  it("is stale when a window moves, appears or goes", () => {
    const delayed = windowsOfDay([task("q", { sta: at("24", "08:00"), eta: at("24", "08:30"), std: at("24", "08:25") })], "2026-09-24");
    expect(sameWindows(before, delayed)).toBe(false);
    expect(sameWindows(before, [])).toBe(false);
    expect(sameWindows([], before)).toBe(false);
  });
});
