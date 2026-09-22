import { describe, expect, it } from "vitest";
import { deviationLevel } from "@/lib/turnaround";
import { fieldErrors } from "@/lib/validation/form";
import { settingsSchema, type SettingsFormInput } from "@/lib/validation/settings";

const valid: SettingsFormInput = { deviationGreenMaxMinutes: "0", deviationYellowMaxMinutes: "5" };

function errorsFor(input: Partial<SettingsFormInput>) {
  const result = settingsSchema.safeParse({ ...valid, ...input });
  return result.success ? {} : fieldErrors(result.error);
}

describe("settings form validation", () => {
  it("accepts the defaults", () => {
    expect(settingsSchema.parse(valid)).toEqual({ deviationGreenMaxMinutes: 0, deviationYellowMaxMinutes: 5 });
  });

  it("rejects empty, fractional, negative and out-of-range values", () => {
    expect(errorsFor({ deviationGreenMaxMinutes: "" })).toHaveProperty("deviationGreenMaxMinutes");
    expect(errorsFor({ deviationGreenMaxMinutes: "1.5" })).toHaveProperty("deviationGreenMaxMinutes");
    expect(errorsFor({ deviationGreenMaxMinutes: "-1" })).toHaveProperty("deviationGreenMaxMinutes");
    expect(errorsFor({ deviationYellowMaxMinutes: "1441" })).toHaveProperty("deviationYellowMaxMinutes");
  });

  it("requires the green threshold not to exceed the yellow one", () => {
    expect(errorsFor({ deviationGreenMaxMinutes: "6" })).toHaveProperty("deviationYellowMaxMinutes");
    expect(errorsFor({ deviationGreenMaxMinutes: "5", deviationYellowMaxMinutes: "5" })).toEqual({});
  });
});

describe("colouring follows the configured thresholds", () => {
  it("uses stricter thresholds when they are set", () => {
    const strict = { greenMax: 0, yellowMax: 2 };
    expect(deviationLevel(2, strict)).toBe("yellow");
    expect(deviationLevel(3, strict)).toBe("red");
  });

  it("uses looser thresholds when they are set", () => {
    const loose = { greenMax: 3, yellowMax: 10 };
    expect(deviationLevel(3, loose)).toBe("green");
    expect(deviationLevel(10, loose)).toBe("yellow");
    expect(deviationLevel(11, loose)).toBe("red");
  });
});
