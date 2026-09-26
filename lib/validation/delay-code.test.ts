import { describe, expect, it } from "vitest";
import { delayCodeSchema, delayRecordSchema } from "@/lib/validation/delay-code";
import { fieldErrors } from "@/lib/validation/form";

describe("delay codes (7. mérföldkő)", () => {
  it("takes a code as the MVT writes it, with an optional description", () => {
    expect(delayCodeSchema.parse({ code: " 93 ", description: " ", active: "on" })).toEqual({ code: "93", description: null, active: true });
    expect(delayCodeSchema.parse({ code: "36a", description: "Catering", active: "" })).toEqual({ code: "36A", description: "Catering", active: false });
    expect(delayCodeSchema.parse({ code: "rl", description: "", active: "on" }).code).toBe("RL");
  });

  it("refuses other codes and long descriptions", () => {
    const errors = (input: Record<string, string>) => {
      const result = delayCodeSchema.safeParse({ code: "93", description: "", active: "on", ...input });
      return result.success ? {} : fieldErrors(result.error);
    };
    expect(errors({ code: "9" })).toHaveProperty("code");
    expect(errors({ code: "0040" })).toHaveProperty("code");
    expect(errors({ description: "x".repeat(201) })).toHaveProperty("description");
  });
});

describe("delay records", () => {
  it("takes a code and whole minutes", () => {
    expect(delayRecordSchema.parse({ code: "93", minutes: " 17 " })).toEqual({ code: "93", minutes: 17 });
    expect(delayRecordSchema.safeParse({ code: "93", minutes: "0" }).success).toBe(false);
    expect(delayRecordSchema.safeParse({ code: "93", minutes: "1.5" }).success).toBe(false);
    expect(delayRecordSchema.safeParse({ code: "0040", minutes: "5" }).success).toBe(false);
  });
});
