import { describe, expect, it } from "vitest";
import { fieldSchema, typeSchema } from "@/lib/validation/equipment";

describe("the equipment type form", () => {
  it("takes a name and an upper-case code", () => {
    expect(typeSchema.parse({ name: " Pushback ", code: " pb-1 ", active: "on" })).toEqual({ name: "Pushback", code: "PB-1", active: true });
    expect(typeSchema.safeParse({ name: "Busz", code: "BUSZ 1", active: "" }).success).toBe(false);
    expect(typeSchema.safeParse({ name: "", code: "B", active: "" }).success).toBe(false);
  });
});

describe("the field form", () => {
  it("keeps a unit only for a counter", () => {
    expect(fieldSchema.parse({ name: "Üzemóra", kind: "COUNTER", unit: " üzemóra ", active: "on" })).toEqual({
      name: "Üzemóra",
      kind: "COUNTER",
      unit: "üzemóra",
      active: true,
    });
    expect(fieldSchema.parse({ name: "Műszaki vizsga", kind: "DEADLINE", unit: "nap", active: "on" }).unit).toBeNull();
    expect(fieldSchema.parse({ name: "Km", kind: "COUNTER", unit: "", active: "" }).unit).toBeNull();
  });

  it("needs a known kind", () => {
    expect(fieldSchema.safeParse({ name: "X", kind: "DATE", unit: "", active: "" }).success).toBe(false);
  });
});
