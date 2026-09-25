import { describe, expect, it } from "vitest";
import { takeOver, type TakeoverTask } from "@/lib/planning/takeover";

// "Kiosztás átvétele" (CLAUDE.md, 4. mérföldkő): only unassigned parts are filled.

const task = (id: string, overrides: Partial<TakeoverTask> = {}): TakeoverTask => ({
  id,
  flightLabel: `FR${id}`,
  type: "LONG",
  activeParts: ["ARRIVAL_PART", "DEPARTURE_PART"],
  arrivalAgentId: null,
  departureAgentId: null,
  ...overrides,
});
const tasksOf = (...list: TakeoverTask[]) => new Map(list.map((t) => [t.id, t]));
const anyone = () => true;

describe("taking the plan's assignment over", () => {
  it("fills the unassigned parts of a long turnaround, each from its own position", () => {
    const result = takeOver(
      [
        { taskId: "1", part: "ARRIVAL_PART", agentId: "kiss" },
        { taskId: "1", part: "DEPARTURE_PART", agentId: "nagy" },
      ],
      tasksOf(task("1")),
      anyone,
    );
    expect(result.updates).toEqual([{ taskId: "1", arrivalAgentId: "kiss", departureAgentId: "nagy" }]);
    expect(result.skipped).toEqual([]);
  });

  it("skips and lists the parts already assigned, and leaves them as they are", () => {
    const result = takeOver(
      [
        { taskId: "1", part: "ARRIVAL_PART", agentId: "kiss" },
        { taskId: "1", part: "DEPARTURE_PART", agentId: "nagy" },
      ],
      tasksOf(task("1", { arrivalAgentId: "toth" })),
      anyone,
    );
    expect(result.updates).toEqual([{ taskId: "1", arrivalAgentId: "toth", departureAgentId: "nagy" }]);
    expect(result.skipped).toEqual([
      { taskId: "1", flightLabel: "FR1", part: "ARRIVAL_PART", reason: "assigned", agentId: "toth" },
    ]);
  });

  it("gives both parts of a quick turnaround to the same agent", () => {
    const result = takeOver([{ taskId: "q", part: "WHOLE", agentId: "kiss" }], tasksOf(task("q", { type: "QUICK" })), anyone);
    expect(result.updates).toEqual([{ taskId: "q", arrivalAgentId: "kiss", departureAgentId: "kiss" }]);
    expect(result.assigned).toEqual([{ taskId: "q", flightLabel: "FRq", part: "WHOLE", agentId: "kiss" }]);
  });

  it("treats a quick turnaround with an arrival agent as assigned", () => {
    const result = takeOver(
      [{ taskId: "q", part: "WHOLE", agentId: "kiss" }],
      tasksOf(task("q", { type: "QUICK", arrivalAgentId: "toth" })),
      anyone,
    );
    expect(result.updates).toEqual([]);
    expect(result.skipped[0]).toMatchObject({ reason: "assigned", agentId: "toth" });
  });

  it("follows the task's shape now: a long turnaround turned quick takes the arrival's agent", () => {
    const result = takeOver(
      [
        { taskId: "1", part: "ARRIVAL_PART", agentId: "kiss" },
        { taskId: "1", part: "DEPARTURE_PART", agentId: "nagy" },
      ],
      tasksOf(task("1", { type: "QUICK" })),
      anyone,
    );
    expect(result.updates).toEqual([{ taskId: "1", arrivalAgentId: "kiss", departureAgentId: "kiss" }]);
    expect(result.skipped).toMatchObject([{ part: "DEPARTURE_PART", reason: "assigned", agentId: "kiss" }]);
  });

  it("and a quick turnaround turned long gets both parts from its one window", () => {
    const result = takeOver([{ taskId: "1", part: "WHOLE", agentId: "kiss" }], tasksOf(task("1")), anyone);
    expect(result.updates).toEqual([{ taskId: "1", arrivalAgentId: "kiss", departureAgentId: "kiss" }]);
  });

  it("skips cancelled parts, unnamed positions, gone tasks and agents out of scope", () => {
    const result = takeOver(
      [
        { taskId: "c", part: "ARRIVAL_PART", agentId: "kiss" },
        { taskId: "u", part: "ARRIVAL_PART", agentId: null },
        { taskId: "g", part: "ARRIVAL_PART", agentId: "kiss" },
        { taskId: "s", part: "ARRIVAL_PART", agentId: "outsider" },
      ],
      tasksOf(task("c", { type: null, activeParts: ["DEPARTURE_PART"] }), task("u"), task("s")),
      (_task, agentId) => agentId !== "outsider",
    );
    expect(result.updates).toEqual([]);
    expect(result.skipped.map((s) => [s.taskId, s.reason])).toEqual([
      ["c", "notWorked"],
      ["g", "gone"],
      ["s", "outOfScope"],
      ["u", "unnamed"],
    ]);
  });
});

describe("taking a whole plan over", () => {
  it("fills the parts of every day in one go, a night turnaround's two days included", () => {
    const result = takeOver(
      [
        { taskId: "n", part: "ARRIVAL_PART", agentId: "kiss", day: "2026-09-24" },
        { taskId: "n", part: "DEPARTURE_PART", agentId: "nagy", day: "2026-09-25" },
        { taskId: "m", part: "ARRIVAL_PART", agentId: "kiss", day: "2026-09-25" },
      ],
      tasksOf(task("n"), task("m", { arrivalAgentId: "toth" })),
      anyone,
    );
    expect(result.updates).toEqual([{ taskId: "n", arrivalAgentId: "kiss", departureAgentId: "nagy" }]);
    expect(result.skipped).toEqual([
      { taskId: "m", flightLabel: "FRm", part: "ARRIVAL_PART", reason: "assigned", agentId: "toth", day: "2026-09-25" },
    ]);
  });
});
