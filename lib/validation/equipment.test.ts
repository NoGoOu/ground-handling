import { describe, expect, it } from "vitest";
import { equipmentSchema, fieldSchema, parseValue, typeSchema } from "@/lib/validation/equipment";

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

describe("the equipment form", () => {
  it("takes an upper-case identifier and plate, and empty optional fields as none", () => {
    expect(equipmentSchema.parse({ typeId: "t1", identifier: " pb-07 ", plate: " abc-123 ", description: "", note: " " })).toEqual({
      typeId: "t1",
      identifier: "PB-07",
      plate: "ABC-123",
      description: null,
      note: null,
    });
    expect(equipmentSchema.safeParse({ typeId: "t1", identifier: "", plate: "", description: "", note: "" }).success).toBe(false);
    expect(equipmentSchema.safeParse({ typeId: "", identifier: "PB-07", plate: "", description: "", note: "" }).success).toBe(false);
  });
});

describe("the value of a field", () => {
  const empty = { date: "", value: "", due: "", text: "" };

  it("reads a deadline, empty or a real day", () => {
    const ok = parseValue("DEADLINE", { ...empty, date: "2026-11-30" });
    expect(ok.success && ok.data).toEqual({ kind: "DEADLINE", date: "2026-11-30" });
    const none = parseValue("DEADLINE", empty);
    expect(none.success && none.data).toEqual({ kind: "DEADLINE", date: null });
    expect(parseValue("DEADLINE", { ...empty, date: "2026-02-30" }).success).toBe(false);
  });

  it("reads a counter with a decimal comma and an optional due value", () => {
    const ok = parseValue("COUNTER", { ...empty, value: "1450,5", due: "1500" });
    expect(ok.success && ok.data).toEqual({ kind: "COUNTER", value: 1450.5, due: 1500 });
    const noDue = parseValue("COUNTER", { ...empty, value: "12" });
    expect(noDue.success && noDue.data).toEqual({ kind: "COUNTER", value: 12, due: null });
    expect(parseValue("COUNTER", { ...empty, value: "-3" }).success).toBe(false);
    expect(parseValue("COUNTER", { ...empty, value: "sok" }).success).toBe(false);
  });

  it("reads a text", () => {
    const ok = parseValue("TEXT", { ...empty, text: " bal első kerék kopott " });
    expect(ok.success && ok.data).toEqual({ kind: "TEXT", text: "bal első kerék kopott" });
  });
});
