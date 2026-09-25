import { describe, expect, it } from "vitest";
import { agentsOnOtherTasks, tasksForNewFlight, type AirlineTaskTypeSpec } from "@/lib/task-types";

const type = (code: string, overrides: Partial<AirlineTaskTypeSpec> = {}): AirlineTaskTypeSpec => ({
  taskTypeId: code.toLowerCase(),
  code,
  templateId: `tpl-${code.toLowerCase()}`,
  active: true,
  isPrimary: false,
  ...overrides,
});

describe("the tasks of a new flight", () => {
  it("are one per active task type, with its template, the primary one flagged", () => {
    expect(tasksForNewFlight([type("HDS"), type("GOU", { isPrimary: true }), type("OLD", { active: false })])).toEqual([
      { taskTypeId: "gou", templateId: "tpl-gou", isPrimary: true },
      { taskTypeId: "hds", templateId: "tpl-hds", isPrimary: false },
    ]);
  });

  it("have exactly one primary, even when the primary task type is not active", () => {
    const tasks = tasksForNewFlight([type("HDS"), type("GOU", { isPrimary: true, active: false }), type("BAG")]);
    expect(tasks.filter((t) => t.isPrimary)).toEqual([{ taskTypeId: "bag", templateId: "tpl-bag", isPrimary: true }]);
  });

  it("are none when the airline has no active task type", () => {
    expect(tasksForNewFlight([type("GOU", { active: false, isPrimary: true })])).toEqual([]);
    expect(tasksForNewFlight([])).toEqual([]);
  });
});

describe("the same agent on two task types of a flight", () => {
  const task = (id: string, arrivalAgentId: string | null, departureAgentId: string | null) => ({
    id,
    arrivalAgentId,
    departureAgentId,
  });

  it("is found on either part", () => {
    const gou = task("gou", "anna", "bela");
    expect(agentsOnOtherTasks(gou, [gou, task("hds", null, "anna")])).toEqual(["anna"]);
    expect(agentsOnOtherTasks(gou, [gou, task("hds", "bela", null)])).toEqual(["bela"]);
  });

  it("is not the same agent on both parts of one task", () => {
    const gou = task("gou", "anna", "anna");
    expect(agentsOnOtherTasks(gou, [gou, task("hds", "bela", "bela")])).toEqual([]);
  });
});
