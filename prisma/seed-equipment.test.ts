import { describe, expect, it } from "vitest";
import { isReportable } from "@/lib/equipment/faults";
import { counterStatus, deadlineStatus, equipmentAlerts, expiringGroups, type FieldValue } from "@/lib/equipment/status";
import { DEFAULT_EQUIPMENT_WARNING_DAYS } from "@/lib/settings";
import { SEED_USERS } from "./seed-data";
import { SEED_EQUIPMENT, SEED_EQUIPMENT_TYPES, SEED_FAULTS, SEED_TECHNICIAN, seedFieldValue } from "./seed-equipment";

// The ground equipment demo data (CLAUDE.md, 11. mérföldkő, 8. lépés).

const DAY = "2026-10-01";

function valuesOf(item: (typeof SEED_EQUIPMENT)[number]): FieldValue[] {
  const type = SEED_EQUIPMENT_TYPES.find((t) => t.code === item.type)!;
  return type.fields.map((field) => {
    const data = seedFieldValue(field.kind, item.values[field.name], DAY);
    return {
      field: { id: field.name, name: field.name, kind: field.kind, unit: field.unit ?? null, active: true },
      dateValue: data.kind === "DEADLINE" ? data.date : null,
      numberValue: data.kind === "COUNTER" ? data.value : null,
      dueValue: data.kind === "COUNTER" ? data.due : null,
      textValue: data.kind === "TEXT" ? data.text : null,
    };
  });
}

const inUse = SEED_EQUIPMENT.filter((item) => !item.retired);

describe("the demo ground equipment", () => {
  it("has a technician among the users", () => {
    expect(SEED_USERS.find((u) => u.username === SEED_TECHNICIAN)?.roles).toEqual(["Műszaki"]);
  });

  it("has the base fields on the motorised types, and only known fields and types on the equipment", () => {
    for (const code of ["PBK", "BLT", "BUS"]) {
      const names = SEED_EQUIPMENT_TYPES.find((t) => t.code === code)!.fields.map((f) => f.name);
      expect(names).toEqual(expect.arrayContaining(["Műszaki vizsga lejárata", "Szerviz esedékessége"]));
      expect(names.some((name) => name === "Üzemóra" || name === "Kilométeróra")).toBe(true);
    }
    for (const item of SEED_EQUIPMENT) {
      const type = SEED_EQUIPMENT_TYPES.find((t) => t.code === item.type);
      expect(type).toBeDefined();
      for (const name of Object.keys(item.values)) expect(type!.fields.map((f) => f.name)).toContain(name);
    }
    expect(new Set(SEED_EQUIPMENT.map((item) => item.identifier)).size).toBe(SEED_EQUIPMENT.length);
  });

  it("shows every deadline state and both counter states on equipment in use", () => {
    const deadlines = new Set<string>();
    const counters = new Set<string>();
    for (const item of inUse) {
      for (const value of valuesOf(item)) {
        if (value.field.kind === "DEADLINE") deadlines.add(deadlineStatus(value.dateValue, DAY, DEFAULT_EQUIPMENT_WARNING_DAYS));
        if (value.field.kind === "COUNTER") counters.add(counterStatus(value.numberValue, value.dueValue));
      }
    }
    expect([...deadlines].sort()).toEqual(["EXPIRED", "EXPIRING", "MISSING", "VALID"]);
    expect(counters).toEqual(new Set(["OK", "DUE", "NO_DUE"]));
  });

  it("fills both groups of the expiring list, a counter among the expired, and leaves the retired one out", () => {
    const { expiring, expired } = expiringGroups(
      inUse.map((item) => ({ equipment: { identifier: item.identifier }, alerts: equipmentAlerts(valuesOf(item), DAY, DEFAULT_EQUIPMENT_WARNING_DAYS) })),
    );
    expect(expiring.length).toBeGreaterThan(1);
    expect(expired.some((row) => row.alert.kind === "COUNTER")).toBe(true);
    expect(expired.some((row) => row.alert.kind === "DEADLINE")).toBe(true);
    const retired = SEED_EQUIPMENT.find((item) => item.retired)!;
    expect(equipmentAlerts(valuesOf(retired), DAY, DEFAULT_EQUIPMENT_WARNING_DAYS).length).toBeGreaterThan(0);
  });

  it("has one open, one in-progress and one closed fault, on equipment that can be reported", () => {
    const states = SEED_FAULTS.map((f) => (f.closed ? "CLOSED" : f.taken ? "IN_PROGRESS" : "OPEN"));
    expect(states.sort()).toEqual(["CLOSED", "IN_PROGRESS", "OPEN"]);
    for (const fault of SEED_FAULTS) {
      const item = SEED_EQUIPMENT.find((e) => e.identifier === fault.equipment)!;
      expect(isReportable(item.retired ? "RETIRED" : "OPERATIONAL")).toBe(true);
      expect(SEED_USERS.map((u) => u.username as string)).toContain(fault.reportedBy);
      // The times go forward: reported, taken, commented, closed.
      const times = [fault.reportedHoursAgo, fault.taken?.hoursAgo, ...(fault.comments ?? []).map((c) => c.hoursAgo), fault.closed?.hoursAgo];
      const given = times.filter((t): t is number => t !== undefined);
      expect([...given].sort((a, b) => b - a)).toEqual(given);
    }
    // The in-progress one keeps its equipment out of service; the closed one sets it back.
    expect(SEED_FAULTS.find((f) => f.taken && !f.closed)!.outOfService).toBe(true);
    expect(SEED_FAULTS.find((f) => f.closed)!.closed!.restore).toBe(true);
  });
});
