import { describe, expect, it } from "vitest";
import { canMoveEquipment, canMoveFault, equipmentStepNeeds, isOpenFault, isReportable, statusOnReport } from "@/lib/equipment/faults";
import { counterStatus, deadlineStatus, equipmentAlerts, expiringGroups, nearestDeadline, type Alert, type FieldValue } from "@/lib/equipment/status";

// Ground equipment and faults (CLAUDE.md, 11. mérföldkő).

describe("a deadline", () => {
  it("is valid, expiring soon, expired, or not given", () => {
    expect(deadlineStatus("2026-12-31", "2026-10-02", 30)).toBe("VALID");
    expect(deadlineStatus("2026-11-01", "2026-10-02", 30)).toBe("EXPIRING");
    expect(deadlineStatus("2026-11-02", "2026-10-02", 30)).toBe("VALID");
    expect(deadlineStatus(null, "2026-10-02", 30)).toBe("MISSING");
  });

  it("is still valid on its own day and expired the day after, like a qualification", () => {
    expect(deadlineStatus("2026-10-02", "2026-10-02", 0)).toBe("EXPIRING");
    expect(deadlineStatus("2026-10-01", "2026-10-02", 30)).toBe("EXPIRED");
  });
});

describe("a counter", () => {
  it("is due once the reading reaches the due value", () => {
    expect(counterStatus(1450, 1500)).toBe("OK");
    expect(counterStatus(1500, 1500)).toBe("DUE");
    expect(counterStatus(1512.5, 1500)).toBe("DUE");
  });

  it("is never due without a due value, and has no status without a reading", () => {
    expect(counterStatus(1450, null)).toBe("NO_DUE");
    expect(counterStatus(null, 1500)).toBe("MISSING");
  });
});

describe("what needs attention on a piece of equipment", () => {
  const field = (id: string, kind: FieldValue["field"]["kind"], active = true, unit: string | null = null) => ({ id, name: id, kind, unit, active });
  const values: FieldValue[] = [
    { field: field("Műszaki vizsga", "DEADLINE"), dateValue: "2026-10-20", numberValue: null, dueValue: null, textValue: null },
    { field: field("Szerviz", "DEADLINE"), dateValue: "2026-09-30", numberValue: null, dueValue: null, textValue: null },
    { field: field("Biztosítás", "DEADLINE"), dateValue: "2027-05-01", numberValue: null, dueValue: null, textValue: null },
    { field: field("Üzemóra", "COUNTER", true, "üzemóra"), dateValue: null, numberValue: 1510, dueValue: 1500, textValue: null },
    { field: field("Régi határidő", "DEADLINE", false), dateValue: "2020-01-01", numberValue: null, dueValue: null, textValue: null },
    { field: field("Megjegyzés", "TEXT"), dateValue: null, numberValue: null, dueValue: null, textValue: "bal első kerék kopott" },
  ];

  it("lists the expiring and expired deadlines and the counters due, passing over inactive fields", () => {
    expect(equipmentAlerts(values, "2026-10-02", 30)).toEqual([
      { fieldId: "Műszaki vizsga", name: "Műszaki vizsga", kind: "DEADLINE", status: "EXPIRING", date: "2026-10-20" },
      { fieldId: "Szerviz", name: "Szerviz", kind: "DEADLINE", status: "EXPIRED", date: "2026-09-30" },
      { fieldId: "Üzemóra", name: "Üzemóra", kind: "COUNTER", status: "DUE", value: 1510, due: 1500, unit: "üzemóra" },
    ]);
  });

  it("gives the nearest deadline with its status", () => {
    expect(nearestDeadline(values, "2026-10-02", 30)).toEqual({ name: "Szerviz", date: "2026-09-30", status: "EXPIRED" });
    expect(nearestDeadline(values.slice(2), "2026-10-02", 30)).toEqual({ name: "Biztosítás", date: "2027-05-01", status: "VALID" });
    expect(nearestDeadline([], "2026-10-02", 30)).toBeNull();
  });
});

describe("the expiring deadlines list", () => {
  const deadline = (name: string, status: "EXPIRING" | "EXPIRED", date: string): Alert => ({ fieldId: name, name, kind: "DEADLINE", status, date });
  const counter = (name: string): Alert => ({ fieldId: name, name, kind: "COUNTER", status: "DUE", value: 1510, due: 1500, unit: "üzemóra" });

  it("groups expiring soon and expired, the counters reached with the expired ones after the dates", () => {
    const { expiring, expired } = expiringGroups([
      { equipment: { identifier: "PB-02" }, alerts: [deadline("Műszaki vizsga", "EXPIRING", "2026-10-20"), counter("Üzemóra")] },
      { equipment: { identifier: "PB-01" }, alerts: [deadline("Szerviz", "EXPIRED", "2026-09-30"), deadline("Műszaki vizsga", "EXPIRING", "2026-10-05")] },
      { equipment: { identifier: "GPU-1" }, alerts: [counter("Üzemóra"), deadline("Műszaki vizsga", "EXPIRED", "2026-08-01")] },
      { equipment: { identifier: "BUS-1" }, alerts: [] },
    ]);
    expect(expiring.map((row) => `${row.equipment.identifier} ${row.alert.name}`)).toEqual(["PB-01 Műszaki vizsga", "PB-02 Műszaki vizsga"]);
    expect(expired.map((row) => `${row.equipment.identifier} ${row.alert.name}`)).toEqual([
      "GPU-1 Műszaki vizsga",
      "PB-01 Szerviz",
      "GPU-1 Üzemóra",
      "PB-02 Üzemóra",
    ]);
  });

  it("orders the same day by identifier", () => {
    const { expiring } = expiringGroups([
      { equipment: { identifier: "ST-2" }, alerts: [deadline("Műszaki vizsga", "EXPIRING", "2026-10-10")] },
      { equipment: { identifier: "ST-1" }, alerts: [deadline("Műszaki vizsga", "EXPIRING", "2026-10-10")] },
    ]);
    expect(expiring.map((row) => row.equipment.identifier)).toEqual(["ST-1", "ST-2"]);
  });
});

describe("a fault", () => {
  it("goes open → in progress → closed, and may be closed without being taken over", () => {
    expect(canMoveFault("OPEN", "IN_PROGRESS")).toBe(true);
    expect(canMoveFault("IN_PROGRESS", "CLOSED")).toBe(true);
    expect(canMoveFault("OPEN", "CLOSED")).toBe(true);
  });

  it("is never reopened, nor taken back", () => {
    expect(canMoveFault("CLOSED", "OPEN")).toBe(false);
    expect(canMoveFault("CLOSED", "IN_PROGRESS")).toBe(false);
    expect(canMoveFault("IN_PROGRESS", "OPEN")).toBe(false);
    expect([isOpenFault("OPEN"), isOpenFault("IN_PROGRESS"), isOpenFault("CLOSED")]).toEqual([true, true, false]);
  });
});

describe("the status of a piece of equipment", () => {
  it("turns out of service at once when a report says so", () => {
    expect(statusOnReport("OPERATIONAL", true)).toBe("OUT_OF_SERVICE");
    expect(statusOnReport("OPERATIONAL", false)).toBeNull();
    expect(statusOnReport("OUT_OF_SERVICE", true)).toBeNull();
  });

  it("takes no report once retired", () => {
    expect(isReportable("RETIRED")).toBe(false);
    expect(isReportable("OUT_OF_SERVICE")).toBe(true);
  });

  it("is set back to operational and retired by hand, by the right people", () => {
    expect(canMoveEquipment("OUT_OF_SERVICE", "OPERATIONAL")).toBe(true);
    expect(canMoveEquipment("OPERATIONAL", "RETIRED")).toBe(true);
    expect(canMoveEquipment("RETIRED", "OUT_OF_SERVICE")).toBe(false);
    expect(canMoveEquipment("OPERATIONAL", "OPERATIONAL")).toBe(false);
    expect(equipmentStepNeeds("OUT_OF_SERVICE", "OPERATIONAL")).toBe("FAULT_MANAGE");
    expect(equipmentStepNeeds("OPERATIONAL", "RETIRED")).toBe("EQUIPMENT_MANAGE");
    expect(equipmentStepNeeds("RETIRED", "OPERATIONAL")).toBe("EQUIPMENT_MANAGE");
  });
});
