// Qualifications of the agents (CLAUDE.md, 6. mérföldkő). Pure functions on
// Budapest days ("YYYY-MM-DD"); the data layer passes in the records.
//
// - A pass is valid until the completion day + the qualification's months,
//   unless the record says otherwise; a qualification without months does not
//   expire.
// - Per qualification the latest passed record counts: a later failed attempt
//   does not take a still valid qualification away.
// - Valid on a day when the end of validity is not earlier than that day.
// - A task's part needs the qualifications set for it; a quick turnaround is
//   one piece of work, so its window needs those of both parts.

import { parseLocalDate } from "@/lib/time";

export type QualificationStatus = "VALID" | "EXPIRING" | "EXPIRED" | "MISSING";

export interface QualificationInfo {
  id: string;
  code: string;
  name: string;
  /** Null: it does not expire. */
  validityMonths: number | null;
  active: boolean;
}

/** What the rules need of a training record. */
export interface QualificationRecord {
  id: string;
  /** The qualification the training gives; null when it gives none. */
  qualificationId: string | null;
  completedOn: string;
  passed: boolean;
  /** Null: no end. */
  validUntil: string | null;
  createdAt: Date;
}

export interface AgentQualification {
  status: QualificationStatus;
  /** From the latest passed record; null when it does not expire or is missing. */
  validUntil: string | null;
  recordId: string | null;
}

const DAY_MS = 86_400_000;

function toUtc(day: string): number {
  const d = parseLocalDate(day);
  if (!d) throw new Error(`Invalid day: ${day}`);
  return Date.UTC(d.year, d.month - 1, d.day);
}

/** Whole days from a to b. */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b) - toUtc(a)) / DAY_MS);
}

/** The day months later; the last day of the month when that day does not exist (Jan 31 + 1 → Feb 28/29). */
export function addMonths(day: string, months: number): string {
  const d = parseLocalDate(day);
  if (!d) throw new Error(`Invalid day: ${day}`);
  const monthIndex = d.month - 1 + months;
  const year = d.year + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const result = new Date(Date.UTC(year, month, Math.min(d.day, lastDay)));
  return result.toISOString().slice(0, 10);
}

/** The end of validity a record gets unless set by hand. */
export function defaultValidUntil(completedOn: string, validityMonths: number | null): string | null {
  return validityMonths === null ? null : addMonths(completedOn, validityMonths);
}

/** The latest passed record of a qualification: by completion day, then by when it was recorded. */
export function latestPassed(records: readonly QualificationRecord[], qualificationId: string): QualificationRecord | null {
  let latest: QualificationRecord | null = null;
  for (const record of records) {
    if (!record.passed || record.qualificationId !== qualificationId) continue;
    if (
      !latest ||
      record.completedOn > latest.completedOn ||
      (record.completedOn === latest.completedOn && record.createdAt.getTime() > latest.createdAt.getTime())
    ) {
      latest = record;
    }
  }
  return latest;
}

/** The status of a pass on a day; warningDays make "hamarosan lejár". */
export function statusOn(record: Pick<QualificationRecord, "validUntil"> | null, day: string, warningDays: number): QualificationStatus {
  if (!record) return "MISSING";
  if (record.validUntil === null) return "VALID";
  const left = daysBetween(day, record.validUntil);
  if (left < 0) return "EXPIRED";
  return left <= warningDays ? "EXPIRING" : "VALID";
}

/** Usable on the day: valid, or valid but expiring soon. */
export const isUsable = (status: QualificationStatus) => status === "VALID" || status === "EXPIRING";

/** An agent's active qualifications on a day, each with its status. */
export function agentQualifications(
  records: readonly QualificationRecord[],
  qualifications: readonly QualificationInfo[],
  day: string,
  warningDays: number,
): Map<string, AgentQualification> {
  const result = new Map<string, AgentQualification>();
  for (const qualification of qualifications) {
    if (!qualification.active) continue;
    const record = latestPassed(records, qualification.id);
    result.set(qualification.id, {
      status: statusOn(record, day, warningDays),
      validUntil: record?.validUntil ?? null,
      recordId: record?.id ?? null,
    });
  }
  return result;
}

/** The ids of the agent's usable qualifications on the day. */
export function usableOn(records: readonly QualificationRecord[], day: string): Set<string> {
  const ids = new Set(records.filter((r) => r.passed && r.qualificationId).map((r) => r.qualificationId!));
  return new Set([...ids].filter((id) => isUsable(statusOn(latestPassed(records, id), day, 0))));
}

export interface PartRequirement {
  part: "ARRIVAL_PART" | "DEPARTURE_PART";
  qualificationId: string;
  /** An inactive qualification is not required. */
  active: boolean;
}

/** What a window of a task needs: its part's qualifications; on a quick turnaround, those of both parts. */
export function windowRequirement(
  requirements: readonly PartRequirement[],
  part: "WHOLE" | "ARRIVAL_PART" | "DEPARTURE_PART",
): string[] {
  const ids = requirements
    .filter((r) => r.active && (part === "WHOLE" || r.part === part))
    .map((r) => r.qualificationId);
  return [...new Set(ids)].sort();
}

export interface Shortfall {
  qualificationId: string;
  status: "EXPIRED" | "MISSING";
}

/** The required qualifications the agent lacks on the day: expired or missing, in the given order. */
export function shortfalls(
  required: readonly string[],
  records: readonly QualificationRecord[],
  day: string,
): Shortfall[] {
  return required.flatMap((qualificationId) => {
    const status = statusOn(latestPassed(records, qualificationId), day, 0);
    return isUsable(status) ? [] : [{ qualificationId, status: status as "EXPIRED" | "MISSING" }];
  });
}

export interface TaskWindowCheck {
  part: "WHOLE" | "ARRIVAL_PART" | "DEPARTURE_PART";
  start: Date;
}

export interface AgentShortfall {
  agentId: string;
  part: TaskWindowCheck["part"];
  /** The Budapest day of the window's start: the day the qualifications must be valid on. */
  day: string;
  shortfalls: Shortfall[];
}

/**
 * What the agents of a task lack for its windows (CLAUDE.md, 6. mérföldkő,
 * "Követelmények"): each window is done by the agent of its part (a quick
 * turnaround's by the arrival agent), who needs the window's qualifications on
 * the day the window starts. Only the windows with something missing.
 */
export function taskShortfalls(
  windows: readonly TaskWindowCheck[],
  agents: { arrivalAgentId: string | null; departureAgentId: string | null },
  requirements: readonly PartRequirement[],
  recordsOf: (agentId: string) => readonly QualificationRecord[],
  dayOf: (instant: Date) => string,
): AgentShortfall[] {
  return windows.flatMap((window) => {
    const agentId = window.part === "DEPARTURE_PART" ? agents.departureAgentId : agents.arrivalAgentId;
    if (!agentId) return [];
    const day = dayOf(window.start);
    const missing = shortfalls(windowRequirement(requirements, window.part), recordsOf(agentId), day);
    return missing.length > 0 ? [{ agentId, part: window.part, day, shortfalls: missing }] : [];
  });
}
