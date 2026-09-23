import type { Role } from "@/generated/prisma/enums";
import { effectiveDepartureAgentId, type Part, type TurnaroundType } from "@/lib/turnaround";

// Authorization rules (CLAUDE.md, "Szerepkörök"). Pure functions, used by the proxy,
// pages and every server action.

export interface Actor {
  id: string;
  role: Role;
}

export interface TaskAssignment {
  arrivalAgentId: string | null;
  departureAgentId: string | null;
  type: TurnaroundType;
}

function isManager(actor: Actor): boolean {
  return actor.role === "ADMIN" || actor.role === "SHIFT_LEAD";
}

export function homePathFor(role: Role): string {
  return role === "AGENT" ? "/agent" : "/flights";
}

const ROUTE_ROLES: [prefix: string, roles: Role[]][] = [
  ["/admin", ["ADMIN"]],
  ["/flights", ["ADMIN", "SHIFT_LEAD"]],
  ["/shifts", ["ADMIN", "SHIFT_LEAD"]],
  ["/board", ["ADMIN", "SHIFT_LEAD"]],
  ["/agent", ["ADMIN", "AGENT"]],
];

/** Route-level check used by the proxy. Object-level checks happen in pages and actions. */
export function canAccessPath(role: Role, pathname: string): boolean {
  const rule = ROUTE_ROLES.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return !rule || rule[1].includes(role);
}

export function canManageFlights(actor: Actor): boolean {
  return isManager(actor);
}

export function canAssignAgents(actor: Actor): boolean {
  return isManager(actor);
}

/** Shift rosters are kept by the shift lead and the admin. */
export function canManageShifts(actor: Actor): boolean {
  return isManager(actor);
}

export function canAdminister(actor: Actor): boolean {
  return actor.role === "ADMIN";
}

export function canUseAgentView(actor: Actor): boolean {
  return actor.role === "AGENT" || actor.role === "ADMIN";
}

/** The parts of the task the agent is (effectively) assigned to. */
export function assignedParts(actor: Actor, task: TaskAssignment): Part[] {
  const parts: Part[] = [];
  if (task.arrivalAgentId === actor.id) parts.push("ARRIVAL_PART");
  if (effectiveDepartureAgentId(task.type, task.arrivalAgentId, task.departureAgentId) === actor.id) {
    parts.push("DEPARTURE_PART");
  }
  return parts;
}

/** Until shift rosters exist, an agent sees the tasks assigned to them. */
export function canViewTask(actor: Actor, task: TaskAssignment): boolean {
  return isManager(actor) || (actor.role === "AGENT" && assignedParts(actor, task).length > 0);
}

export function canChangeTaskStatus(actor: Actor, task: TaskAssignment): boolean {
  return canViewTask(actor, task);
}

/**
 * Recording a new time or correcting an existing one. Managers may do anything;
 * an agent only on their own part, and only their own records.
 */
export function canRecordMilestone(
  actor: Actor,
  task: TaskAssignment,
  part: Part,
  existing: { recordedById: string } | null,
): boolean {
  if (isManager(actor)) return true;
  if (actor.role !== "AGENT") return false;
  if (!assignedParts(actor, task).includes(part)) return false;
  return !existing || existing.recordedById === actor.id;
}
