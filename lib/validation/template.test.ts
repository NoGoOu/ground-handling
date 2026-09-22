import { describe, expect, it } from "vitest";
import { DEMO_MILESTONES, DEMO_TEMPLATE_PARAMS } from "@/lib/demo-template";
import { messages } from "@/lib/messages";
import {
  insertIndex,
  milestoneSchema,
  moveInOrder,
  templateSchema,
  templateStructureError,
} from "@/lib/validation/template";

const e = messages.templateForm.errors;
const demo = DEMO_MILESTONES.map((m) => ({ ...m, id: m.code }));

function reorder(ids: string[]) {
  return ids.map((id, i) => ({ ...demo.find((m) => m.id === id)!, order: i + 1 }));
}

describe("template parameters", () => {
  it("accepts the demo values", () => {
    const input = Object.fromEntries(Object.entries(DEMO_TEMPLATE_PARAMS).map(([k, v]) => [k, String(v)]));
    expect(templateSchema.parse({ ...input, name: " Alap " })).toEqual({ ...DEMO_TEMPLATE_PARAMS, name: "Alap" });
  });

  it("rejects negative, fractional and missing minutes", () => {
    const base = { name: "X", minTurnaroundMinutes: "25", travelMinutes: "5", postDepartureMinutes: "15", departureReportMinutes: "40" };
    expect(templateSchema.safeParse({ ...base, minBreakMinutes: "-1" }).success).toBe(false);
    expect(templateSchema.safeParse({ ...base, minBreakMinutes: "1.5" }).success).toBe(false);
    expect(templateSchema.safeParse({ ...base, minBreakMinutes: "abc" }).success).toBe(false);
    expect(templateSchema.safeParse({ ...base, minBreakMinutes: "" }).success).toBe(false);
    expect(templateSchema.safeParse({ ...base, minBreakMinutes: "1441" }).success).toBe(false);
    expect(templateSchema.safeParse({ ...base, minBreakMinutes: "0" }).success).toBe(true);
  });
});

describe("milestone fields", () => {
  it("normalises the code and parses the offset", () => {
    const data = milestoneSchema.parse({
      code: " fuel_start ",
      name: " Fuel start ",
      anchor: "DEPARTURE",
      offsetMinutes: "-20",
      required: "",
      part: "DEPARTURE_PART",
    });
    expect(data).toEqual({
      code: "FUEL_START",
      name: "Fuel start",
      anchor: "DEPARTURE",
      offsetMinutes: -20,
      required: false,
      part: "DEPARTURE_PART",
    });
  });

  it("rejects bad codes, anchors and parts", () => {
    const result = milestoneSchema.safeParse({
      code: "a b",
      name: "x",
      anchor: "MIDDLE",
      offsetMinutes: "0",
      required: "on",
      part: "SOMEWHERE",
    });
    expect(result.success).toBe(false);
  });
});

describe("template structure", () => {
  it("accepts the demo template", () => {
    expect(templateStructureError(demo)).toBeNull();
  });

  it("requires ATA and ATD", () => {
    expect(templateStructureError(demo.filter((m) => m.code !== "ATA"))).toBe(e.missingSystemMilestone);
    expect(templateStructureError(demo.filter((m) => m.code !== "ATD"))).toBe(e.missingSystemMilestone);
  });

  it("keeps ATA first and ATD last", () => {
    const ids = demo.map((m) => m.id);
    expect(templateStructureError(reorder(moveInOrder(demo, "ATA", "down")))).toBe(e.ataFirst);
    expect(templateStructureError(reorder([...ids.slice(0, 8), "ATD", ids[8]]))).toBe(e.atdLast);
  });

  it("locks the ATA and ATD settings", () => {
    const changed = demo.map((m) => (m.code === "ATA" ? { ...m, offsetMinutes: 3 } : m));
    expect(templateStructureError(changed)).toBe(messages.templateForm.locked);
    const optional = demo.map((m) => (m.code === "ATD" ? { ...m, required: false } : m));
    expect(templateStructureError(optional)).toBe(messages.templateForm.locked);
  });

  it("keeps the arrival part before the departure part", () => {
    // Swapping Last pax out (arrival) and First pax in (departure).
    expect(templateStructureError(reorder(moveInOrder(demo, "LAST_PAX_OUT", "down")))).toBe(e.partOrder);
  });

  it("rejects duplicate codes", () => {
    const duplicate = [...demo, { ...demo[1], id: "x", order: 99 }];
    expect(templateStructureError(duplicate)).toBe(e.codeTaken);
  });
});

describe("ordering helpers", () => {
  it("moves a milestone by one place and ignores moves past the ends", () => {
    expect(moveInOrder(demo, "FRONT_DOOR_OPEN", "down").slice(0, 3)).toEqual(["ATA", "BACK_DOOR_OPEN", "FRONT_DOOR_OPEN"]);
    expect(moveInOrder(demo, "ATA", "up")[0]).toBe("ATA");
    expect(moveInOrder(demo, "ATD", "down").at(-1)).toBe("ATD");
  });

  it("inserts a new milestone at the end of its part", () => {
    expect(insertIndex(demo, "ARRIVAL_PART")).toBe(5); // after Last pax out
    expect(insertIndex(demo, "DEPARTURE_PART")).toBe(9); // before ATD
  });
});
