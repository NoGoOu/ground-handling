import { daysBetween } from "@/lib/qualifications";

// The technical data of ground equipment (CLAUDE.md, 11. mérföldkő,
// "Műszaki adatok"): a deadline is watched like a qualification (valid,
// expiring soon, expired), a counter warns once it reaches its due value.
// Pure functions on Budapest days ("YYYY-MM-DD").

export type DeadlineStatus = "VALID" | "EXPIRING" | "EXPIRED" | "MISSING";

/** A deadline is valid on a day when it is not earlier than that day; "expiring" within the warning days. */
export function deadlineStatus(date: string | null, today: string, warningDays: number): DeadlineStatus {
  if (!date) return "MISSING";
  const left = daysBetween(today, date);
  if (left < 0) return "EXPIRED";
  return left <= warningDays ? "EXPIRING" : "VALID";
}

export type CounterStatus = "OK" | "DUE" | "NO_DUE" | "MISSING";

/** A counter is due once its reading reaches the due value; without one it never is. */
export function counterStatus(value: number | null, due: number | null): CounterStatus {
  if (value === null) return "MISSING";
  if (due === null) return "NO_DUE";
  return value >= due ? "DUE" : "OK";
}

export type FieldKind = "DEADLINE" | "COUNTER" | "TEXT";

/** One field of one piece of equipment with its value; the date as a Budapest day. */
export interface FieldValue {
  field: { id: string; name: string; kind: FieldKind; unit: string | null; active: boolean };
  dateValue: string | null;
  numberValue: number | null;
  dueValue: number | null;
  textValue: string | null;
}

export type Alert =
  | { fieldId: string; name: string; kind: "DEADLINE"; status: "EXPIRING" | "EXPIRED"; date: string }
  | { fieldId: string; name: string; kind: "COUNTER"; status: "DUE"; value: number; due: number; unit: string | null };

/**
 * What needs attention on a piece of equipment: deadlines expiring soon or
 * expired, and counters that reached their due value (approved decision 2:
 * they go with the expired ones). Inactive fields are passed over.
 */
export function equipmentAlerts(values: readonly FieldValue[], today: string, warningDays: number): Alert[] {
  const alerts: Alert[] = [];
  for (const { field, dateValue, numberValue, dueValue } of values) {
    if (!field.active) continue;
    if (field.kind === "DEADLINE") {
      const status = deadlineStatus(dateValue, today, warningDays);
      if (status === "EXPIRING" || status === "EXPIRED") alerts.push({ fieldId: field.id, name: field.name, kind: "DEADLINE", status, date: dateValue! });
    }
    if (field.kind === "COUNTER" && counterStatus(numberValue, dueValue) === "DUE") {
      alerts.push({ fieldId: field.id, name: field.name, kind: "COUNTER", status: "DUE", value: numberValue!, due: dueValue!, unit: field.unit });
    }
  }
  return alerts;
}

/** The earliest deadline of a piece of equipment among its active fields, with its status. */
export function nearestDeadline(
  values: readonly FieldValue[],
  today: string,
  warningDays: number,
): { name: string; date: string; status: DeadlineStatus } | null {
  let nearest: { name: string; date: string } | null = null;
  for (const { field, dateValue } of values) {
    if (!field.active || field.kind !== "DEADLINE" || !dateValue) continue;
    if (!nearest || dateValue < nearest.date) nearest = { name: field.name, date: dateValue };
  }
  return nearest && { ...nearest, status: deadlineStatus(nearest.date, today, warningDays) };
}

export interface ExpiringRow<E> {
  equipment: E;
  alert: Alert;
}

/**
 * The expiring deadlines list (CLAUDE.md, 11. mérföldkő): two groups. Expiring
 * soon by date; expired by date (the longest expired first), then the counters
 * that reached their due value (approved decision 2), by identifier.
 */
export function expiringGroups<E extends { identifier: string }>(
  items: readonly { equipment: E; alerts: readonly Alert[] }[],
): { expiring: ExpiringRow<E>[]; expired: ExpiringRow<E>[] } {
  const rows = items.flatMap(({ equipment, alerts }) => alerts.map((alert) => ({ equipment, alert })));
  const byDate = (a: ExpiringRow<E>, b: ExpiringRow<E>) => {
    const dateA = a.alert.kind === "DEADLINE" ? a.alert.date : null;
    const dateB = b.alert.kind === "DEADLINE" ? b.alert.date : null;
    if (dateA !== dateB) {
      if (dateA === null) return 1;
      if (dateB === null) return -1;
      return dateA < dateB ? -1 : 1;
    }
    return a.equipment.identifier.localeCompare(b.equipment.identifier, "hu") || a.alert.name.localeCompare(b.alert.name, "hu");
  };
  return {
    expiring: rows.filter((row) => row.alert.status === "EXPIRING").sort(byDate),
    expired: rows.filter((row) => row.alert.status !== "EXPIRING").sort(byDate),
  };
}
