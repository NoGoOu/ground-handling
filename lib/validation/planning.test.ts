import { describe, expect, it } from "vitest";
import { fieldErrors } from "@/lib/validation/form";
import { planningSettingsSchema, type PlanningSettingsFormInput } from "@/lib/validation/planning";

const valid: PlanningSettingsFormInput = {
  minShiftMinutes: "240",
  maxShiftMinutes: "720",
  breakMinutes: "20",
  breakAfterMinutes: "360",
  restMinutes: "0",
  overlapMinutes: "0",
  extraPositions: "0",
  segmentTypeId: "shift",
};

function errorsFor(input: Partial<PlanningSettingsFormInput>) {
  const result = planningSettingsSchema.safeParse({ ...valid, ...input });
  return result.success ? {} : fieldErrors(result.error);
}

describe("planning settings form", () => {
  it("accepts the defaults", () => {
    expect(planningSettingsSchema.parse(valid)).toEqual({
      minShiftMinutes: 240,
      maxShiftMinutes: 720,
      breakMinutes: 20,
      breakAfterMinutes: 360,
      restMinutes: 0,
      overlapMinutes: 0,
      extraPositions: 0,
      segmentTypeId: "shift",
    });
  });

  it("rejects empty, fractional, negative and out-of-range values", () => {
    expect(errorsFor({ minShiftMinutes: "" })).toHaveProperty("minShiftMinutes");
    expect(errorsFor({ breakMinutes: "1.5" })).toHaveProperty("breakMinutes");
    expect(errorsFor({ restMinutes: "-5" })).toHaveProperty("restMinutes");
    expect(errorsFor({ maxShiftMinutes: "1441" })).toHaveProperty("maxShiftMinutes");
    expect(errorsFor({ extraPositions: "51" })).toHaveProperty("extraPositions");
  });

  it("wants the maximum shift at least the minimum", () => {
    expect(errorsFor({ minShiftMinutes: "300", maxShiftMinutes: "299" })).toHaveProperty("maxShiftMinutes");
    expect(errorsFor({ minShiftMinutes: "300", maxShiftMinutes: "300" })).toEqual({});
  });

  it("allows rest or overlap, not both", () => {
    expect(errorsFor({ restMinutes: "10" })).toEqual({});
    expect(errorsFor({ overlapMinutes: "10" })).toEqual({});
    expect(errorsFor({ restMinutes: "10", overlapMinutes: "5" })).toHaveProperty("overlapMinutes");
  });

  it("needs a segment type", () => {
    expect(errorsFor({ segmentTypeId: "" })).toHaveProperty("segmentTypeId");
  });
});
