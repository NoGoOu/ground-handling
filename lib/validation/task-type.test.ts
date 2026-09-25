import { describe, expect, it } from "vitest";
import { messages } from "@/lib/messages";
import { fieldErrors } from "@/lib/validation/form";
import { airlineTaskTypesError, airlineTaskTypesFrom, requirementsFrom, taskTypeSchema } from "@/lib/validation/task-type";

const e = messages.taskTypes.errors;

describe("task type form", () => {
  it("takes a name and a short upper-case code", () => {
    expect(taskTypeSchema.parse({ name: " Ground ops ", code: "gou" })).toEqual({ name: "Ground ops", code: "GOU" });
  });

  it("rejects an empty name and an odd code", () => {
    const result = taskTypeSchema.safeParse({ name: "", code: "G-1" });
    expect(result.success ? {} : fieldErrors(result.error)).toEqual({ name: e.name, code: e.code });
  });
});

describe("an airline's task types", () => {
  const row = (taskTypeId: string, templateId: string | null, active: boolean) => ({ taskTypeId, templateId, active });

  it("read from the form", () => {
    const form = new FormData();
    form.set("template:gou", "t1");
    form.set("active:gou", "on");
    form.set("template:hds", "");
    form.set("primary", "gou");
    expect(airlineTaskTypesFrom(form, ["gou", "hds"])).toEqual({
      rows: [row("gou", "t1", true), row("hds", null, false)],
      primaryId: "gou",
    });
  });

  it("need a template when active, and one active primary", () => {
    expect(airlineTaskTypesError([row("gou", "t1", true), row("hds", "t2", false)], "gou")).toBeNull();
    expect(airlineTaskTypesError([row("gou", null, true)], "gou")).toBe(e.templateRequired);
    expect(airlineTaskTypesError([row("gou", "t1", true)], null)).toBe(e.primaryMissing);
    expect(airlineTaskTypesError([row("gou", "t1", true), row("hds", "t2", false)], "hds")).toBe(e.primaryInactive);
  });

  it("may all be inactive: the airline then takes no flights", () => {
    expect(airlineTaskTypesError([row("gou", "t1", false)], null)).toBeNull();
    expect(airlineTaskTypesError([], null)).toBeNull();
  });
});

describe("the requirements of an airline's task types (6. mérföldkő)", () => {
  it("are read per task type and part", () => {
    const form = new FormData();
    form.append("req:gou:ARRIVAL_PART", "prm");
    form.append("req:gou:ARRIVAL_PART", "dg");
    form.append("req:gou:DEPARTURE_PART", "alt");
    form.append("req:gou:DEPARTURE_PART", "alt");
    expect(requirementsFrom(form, ["gou", "hds"])).toEqual(
      new Map([
        ["gou", { ARRIVAL_PART: ["dg", "prm"], DEPARTURE_PART: ["alt"] }],
        ["hds", { ARRIVAL_PART: [], DEPARTURE_PART: [] }],
      ]),
    );
  });
});
