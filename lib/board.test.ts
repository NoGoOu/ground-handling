import { describe, expect, it } from "vitest";
import { buildBoard, conflictsFor, mergeWindows, taskBoxes, type BoardShift, type BoardTask } from "@/lib/board";

const at = (hhmm: string) => new Date(`2026-09-22T${hhmm}:00Z`);
const agents = [
  { id: "anna", name: "Anna" },
  { id: "bela", name: "Béla" },
];

function task(overrides: Partial<BoardTask> = {}): BoardTask {
  return {
    id: "t1",
    flightLabel: "ZZ1101 / ZZ1102",
    stand: "31",
    status: "PLANNED",
    type: "QUICK",
    arrivalAgentId: "anna",
    departureAgentId: "anna",
    windows: [{ part: "WHOLE", start: at("07:00"), end: at("08:00") }],
    ...overrides,
  };
}

const longTask = task({
  id: "t2",
  flightLabel: "ZZ1203 / ZZ1204",
  stand: "33",
  type: "LONG",
  arrivalAgentId: "anna",
  departureAgentId: "bela",
  windows: [
    { part: "ARRIVAL_PART", start: at("10:00"), end: at("10:30") },
    { part: "DEPARTURE_PART", start: at("12:00"), end: at("13:00") },
  ],
});

const shift = (userId: string, from: string, to: string, id = `${userId}-${from}`): BoardShift => ({
  id,
  userId,
  start: at(from),
  end: at(to),
});

describe("boxes", () => {
  it("makes one box for a quick turnaround and two for a long one", () => {
    expect(taskBoxes(task())).toHaveLength(1);
    expect(taskBoxes(longTask).map((b) => b.part)).toEqual(["ARRIVAL_PART", "DEPARTURE_PART"]);
  });

  it("puts each part on its own agent", () => {
    expect(taskBoxes(longTask).map((b) => b.agentId)).toEqual(["anna", "bela"]);
  });

  it("gives the quick turnaround box to the arrival agent", () => {
    const quick = task({ arrivalAgentId: "anna", departureAgentId: "bela" });
    expect(taskBoxes(quick)[0].agentId).toBe("anna");
  });
});

describe("merging shifts", () => {
  it("joins touching and overlapping stretches", () => {
    const merged = mergeWindows([
      { start: at("14:00"), end: at("20:00") },
      { start: at("06:00"), end: at("14:00") },
    ]);
    expect(merged).toEqual([{ start: at("06:00"), end: at("20:00") }]);
  });

  it("keeps separate stretches apart", () => {
    const merged = mergeWindows([
      { start: at("06:00"), end: at("10:00") },
      { start: at("12:00"), end: at("14:00") },
    ]);
    expect(merged).toHaveLength(2);
  });
});

describe("conflicts", () => {
  const boxes = taskBoxes(task({ windows: [{ part: "WHOLE", start: at("07:00"), end: at("08:00") }] }));

  it("is quiet when the box sits inside a shift", () => {
    expect(conflictsFor(boxes, [{ start: at("06:00"), end: at("14:00") }]).size).toBe(0);
  });

  it("flags a box that sticks out of the shift", () => {
    expect(conflictsFor(boxes, [{ start: at("07:30"), end: at("14:00") }]).get("t1:WHOLE")).toEqual(["OUTSIDE_SHIFT"]);
  });

  it("accepts a box covered by two touching shifts", () => {
    const covered = conflictsFor(boxes, [
      { start: at("06:00"), end: at("07:30") },
      { start: at("07:30"), end: at("14:00") },
    ]);
    expect(covered.size).toBe(0);
  });

  it("flags both boxes when two occupancy windows overlap", () => {
    const overlapping = [
      ...boxes,
      ...taskBoxes(task({ id: "t3", windows: [{ part: "WHOLE", start: at("07:30"), end: at("09:00") }] })),
    ];
    const conflicts = conflictsFor(overlapping, [{ start: at("06:00"), end: at("14:00") }]);
    expect(conflicts.get("t1:WHOLE")).toEqual(["OVERLAP"]);
    expect(conflicts.get("t3:WHOLE")).toEqual(["OVERLAP"]);
  });

  it("does not flag boxes that only touch", () => {
    const touching = [
      ...boxes,
      ...taskBoxes(task({ id: "t3", windows: [{ part: "WHOLE", start: at("08:00"), end: at("09:00") }] })),
    ];
    expect(conflictsFor(touching, [{ start: at("06:00"), end: at("14:00") }]).size).toBe(0);
  });
});

describe("board", () => {
  const board = buildBoard({
    tasks: [task(), longTask, task({ id: "t4", arrivalAgentId: null, departureAgentId: null })],
    shifts: [shift("anna", "06:00", "14:00")],
    agents,
  });

  it("puts unassigned boxes aside", () => {
    expect(board.unassigned.map((b) => b.taskId)).toEqual(["t4"]);
  });

  it("gives a lane to an agent with a shift and to one with only tasks", () => {
    expect(board.lanes.map((l) => [l.agent.name, l.hasShift])).toEqual([
      ["Anna", true],
      ["Béla", false],
    ]);
  });

  it("marks the box of the agent without a shift", () => {
    const bela = board.lanes.find((l) => l.agent.id === "bela")!;
    expect(bela.boxes[0].conflicts).toEqual(["OUTSIDE_SHIFT"]);
  });

  it("keeps a covered box clean", () => {
    const anna = board.lanes.find((l) => l.agent.id === "anna")!;
    expect(anna.boxes.every((b) => b.conflicts.length === 0)).toBe(true);
    expect(anna.boxes.map((b) => b.taskId)).toEqual(["t1", "t2"]);
  });
});
