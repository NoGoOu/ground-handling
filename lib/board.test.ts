import { describe, expect, it } from "vitest";
import {
  assignmentUpdate,
  boardRange,
  buildBoard,
  conflictsFor,
  hourTicks,
  mergeWindows,
  taskBoxes,
  blocksOf,
  type BoardSegment,
  type BoardTask,
} from "@/lib/board";

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
    late: null,
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

const segment = (
  userId: string,
  from: string,
  to: string,
  overrides: Partial<BoardSegment> = {},
): BoardSegment => ({
  id: `${userId}-${from}`,
  userId,
  start: at(from),
  end: at(to),
  typeName: "Műszak",
  operative: true,
  createBlock: false,
  travelBeforeMinutes: 0,
  travelAfterMinutes: 0,
  location: null,
  description: null,
  ...overrides,
});

/** A training segment that casts a block, travel time included. */
const training = (userId: string, from: string, to: string, travel = 0): BoardSegment =>
  segment(userId, from, to, {
    id: `${userId}-trn-${from}`,
    typeName: "Oktatás",
    operative: false,
    createBlock: true,
    travelBeforeMinutes: travel,
    travelAfterMinutes: travel,
    location: "Oktatóterem",
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

describe("assignment from a drop", () => {
  const current = { arrivalAgentId: "anna", departureAgentId: "bela" };

  it("gives both parts to the arrival agent on a quick turnaround", () => {
    expect(assignmentUpdate("WHOLE", "QUICK", "cili", current)).toEqual({
      arrivalAgentId: "cili",
      departureAgentId: "cili",
    });
  });

  it("changes only the dropped part on a long turnaround", () => {
    expect(assignmentUpdate("ARRIVAL_PART", "LONG", "cili", current)).toEqual({
      arrivalAgentId: "cili",
      departureAgentId: "bela",
    });
    expect(assignmentUpdate("DEPARTURE_PART", "LONG", "cili", current)).toEqual({
      arrivalAgentId: "anna",
      departureAgentId: "cili",
    });
  });

  it("clears the assignment when dropped on the unassigned lane", () => {
    expect(assignmentUpdate("WHOLE", "QUICK", null, current)).toEqual({
      arrivalAgentId: null,
      departureAgentId: null,
    });
    expect(assignmentUpdate("DEPARTURE_PART", "LONG", null, current)).toEqual({
      arrivalAgentId: "anna",
      departureAgentId: null,
    });
  });
});

describe("view range", () => {
  const day = { start: at("22:00"), end: new Date("2026-09-23T22:00:00Z") };

  it("keeps the day when everything fits inside it", () => {
    expect(boardRange(day, [{ start: at("23:00"), end: new Date("2026-09-23T05:00:00Z") }])).toEqual(day);
  });

  it("widens to whole hours around boxes that reach outside", () => {
    const range = boardRange(day, [{ start: at("21:35"), end: new Date("2026-09-23T22:10:00Z") }]);
    expect(range.start.toISOString()).toBe("2026-09-22T21:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-09-23T23:00:00.000Z");
  });

  it("lists one tick per hour, both ends included", () => {
    const ticks = hourTicks({ start: at("06:00"), end: at("09:00") });
    expect(ticks.map((d) => d.toISOString().slice(11, 16))).toEqual(["06:00", "07:00", "08:00", "09:00"]);
  });
});

describe("board", () => {
  const board = buildBoard({
    tasks: [task(), longTask, task({ id: "t4", arrivalAgentId: null, departureAgentId: null })],
    segments: [segment("anna", "06:00", "14:00")],
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

describe("blocks", () => {
  it("widens a non-operative segment with the travel time", () => {
    const [block] = blocksOf([training("anna", "09:00", "10:30", 20)]);
    expect(block.start).toEqual(at("08:40"));
    expect(block.end).toEqual(at("10:50"));
    expect(block.segment).toEqual({ start: at("09:00"), end: at("10:30") });
    expect(block.label).toBe("Oktatás");
    expect(block.location).toBe("Oktatóterem");
  });

  it("only makes a block from a non-operative segment that asks for one", () => {
    const plain = segment("anna", "09:00", "10:30", { operative: false, createBlock: false });
    const operativeBlock = segment("anna", "09:00", "10:30", { createBlock: true });
    expect(blocksOf([plain, operativeBlock])).toEqual([]);
  });

  it("flags a box that runs into a block, travel time included", () => {
    const boxes = taskBoxes(task({ windows: [{ part: "WHOLE", start: at("10:40"), end: at("11:30") }] }));
    const shifts = [{ start: at("06:00"), end: at("14:00") }];
    const blocks = blocksOf([training("anna", "09:00", "10:30", 20)]);
    expect(conflictsFor(boxes, shifts, blocks).get("t1:WHOLE")).toEqual(["BLOCK"]);
  });

  it("leaves a box that only touches the block alone", () => {
    const boxes = taskBoxes(task({ windows: [{ part: "WHOLE", start: at("10:50"), end: at("11:30") }] }));
    const shifts = [{ start: at("06:00"), end: at("14:00") }];
    const blocks = blocksOf([training("anna", "09:00", "10:30", 20)]);
    expect(conflictsFor(boxes, shifts, blocks).size).toBe(0);
  });

  it("puts the blocks on the lane and keeps the operative time as the shift", () => {
    const board = buildBoard({
      tasks: [task()],
      segments: [segment("anna", "06:00", "14:00"), training("anna", "09:00", "10:30", 20)],
      agents,
    });
    const lane = board.lanes.find((l) => l.agent.id === "anna")!;
    expect(lane.shifts).toEqual([{ start: at("06:00"), end: at("14:00") }]);
    expect(lane.blocks).toHaveLength(1);
    expect(lane.hasShift).toBe(true);
  });

  it("gives a lane to an agent who only has a block that day", () => {
    const board = buildBoard({ tasks: [], segments: [training("bela", "09:00", "10:30", 20)], agents });
    const lane = board.lanes.find((l) => l.agent.id === "bela")!;
    expect(lane.hasShift).toBe(false);
    expect(lane.blocks).toHaveLength(1);
  });
});

describe("two task types of one flight (5. mérföldkő)", () => {
  const gou = task({ id: "gou", flightId: "f1", taskTypeCode: "GOU" });
  const hds = task({
    id: "hds",
    flightId: "f1",
    taskTypeCode: "HDS",
    windows: [{ part: "WHOLE", start: at("09:00"), end: at("09:30") }],
  });

  it("warns when the same agent gets both, even without an overlap", () => {
    const board = buildBoard({ tasks: [gou, hds], segments: [segment("anna", "06:00", "14:00")], agents });
    const boxes = board.lanes.find((lane) => lane.agent.id === "anna")!.boxes;
    expect(boxes.map((box) => [box.taskTypeCode, box.conflicts])).toEqual([
      ["GOU", ["SAME_FLIGHT"]],
      ["HDS", ["SAME_FLIGHT"]],
    ]);
  });

  it("lets different agents do them, and one agent do both parts of one task", () => {
    const other = { ...hds, arrivalAgentId: "bela", departureAgentId: "bela" };
    const board = buildBoard({
      tasks: [gou, other, { ...longTask, flightId: "f2", arrivalAgentId: "anna", departureAgentId: "anna" }],
      segments: [segment("anna", "06:00", "14:00"), segment("bela", "06:00", "14:00")],
      agents,
    });
    const conflicts = board.lanes.flatMap((lane) => lane.boxes.flatMap((box) => box.conflicts));
    expect(conflicts).not.toContain("SAME_FLIGHT");
  });
});
