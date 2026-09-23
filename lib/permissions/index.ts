import { effectiveDepartureAgentId, type Part, type TurnaroundType } from "@/lib/turnaround";
import { widerScope, type Permission, type Scope } from "./catalog";

export * from "./catalog";

// Authorization rules (CLAUDE.md, "Jogosultsági rendszer"). Pure functions: the
// code checks permissions, never role names.

export interface GrantedPermission {
  permission: Permission;
  scope: Scope;
}

export interface RoleGrant {
  name: string;
  permissions: GrantedPermission[];
}

export const INDIVIDUAL_SOURCE = "Egyéni jogosultság";

export interface PermissionSource {
  /** Role name, or INDIVIDUAL_SOURCE for a grant given to the user directly. */
  source: string;
  scope: Scope;
}

export interface EffectivePermission {
  permission: Permission;
  /** The widest scope among the sources. */
  scope: Scope;
  sources: PermissionSource[];
}

/** Union of the roles and the individual grants; the widest scope wins. */
export function effectivePermissions({
  roles,
  individual,
}: {
  roles: readonly RoleGrant[];
  individual: readonly GrantedPermission[];
}): EffectivePermission[] {
  const byPermission = new Map<Permission, EffectivePermission>();
  const add = (grant: GrantedPermission, source: string) => {
    const current = byPermission.get(grant.permission);
    if (current) {
      current.scope = widerScope(current.scope, grant.scope);
      current.sources.push({ source, scope: grant.scope });
    } else {
      byPermission.set(grant.permission, {
        permission: grant.permission,
        scope: grant.scope,
        sources: [{ source, scope: grant.scope }],
      });
    }
  };

  for (const role of roles) for (const grant of role.permissions) add(grant, role.name);
  for (const grant of individual) add(grant, INDIVIDUAL_SOURCE);

  return [...byPermission.values()];
}

export interface Actor {
  id: string;
  permissions: readonly EffectivePermission[];
  /** Members of the teams this actor leads, plus the actor (the "team" scope). */
  teamMemberIds: readonly string[];
}

export function scopeOf(actor: Actor, permission: Permission): Scope | null {
  return actor.permissions.find((p) => p.permission === permission)?.scope ?? null;
}

export function can(actor: Actor, permission: Permission): boolean {
  return scopeOf(actor, permission) !== null;
}

/** True when the permission covers at least one of the subjects (user ids). */
export function inScope(actor: Actor, permission: Permission, subjectIds: readonly (string | null)[]): boolean {
  const scope = scopeOf(actor, permission);
  if (!scope) return false;
  if (scope === "ALL") return true;
  const ids = subjectIds.filter((id): id is string => !!id);
  if (scope === "TEAM") return ids.some((id) => id === actor.id || actor.teamMemberIds.includes(id));
  return ids.some((id) => id === actor.id);
}

export interface TaskAssignment {
  arrivalAgentId: string | null;
  departureAgentId: string | null;
  type: TurnaroundType;
}

/** The agents actually working the task; a quick turnaround has one (rule 8). */
export function taskAgentIds(task: TaskAssignment): string[] {
  const departure = effectiveDepartureAgentId(task.type, task.arrivalAgentId, task.departureAgentId);
  return [task.arrivalAgentId, departure].filter((id): id is string => !!id);
}

/** The parts of the task the actor is (effectively) assigned to. */
export function assignedParts(actor: Actor, task: TaskAssignment): Part[] {
  const parts: Part[] = [];
  if (task.arrivalAgentId === actor.id) parts.push("ARRIVAL_PART");
  if (effectiveDepartureAgentId(task.type, task.arrivalAgentId, task.departureAgentId) === actor.id) {
    parts.push("DEPARTURE_PART");
  }
  return parts;
}

/** Whoever may assign tasks also sees the unassigned ones, whatever their scope. */
export function canViewTask(actor: Actor, task: TaskAssignment): boolean {
  const agents = taskAgentIds(task);
  if (agents.length === 0 && can(actor, "TASK_ASSIGN")) return true;
  return inScope(actor, "TASK_VIEW", agents);
}

export function canChangeTaskStatus(actor: Actor, task: TaskAssignment): boolean {
  return inScope(actor, "TASK_STATUS", taskAgentIds(task));
}

/** The agent of one part; on a quick turnaround both parts are the arrival agent's. */
export function agentOfPart(task: TaskAssignment, part: Part): string | null {
  return part === "DEPARTURE_PART"
    ? effectiveDepartureAgentId(task.type, task.arrivalAgentId, task.departureAgentId)
    : task.arrivalAgentId;
}

/**
 * Recording a new time or correcting an existing one. Correcting someone else's
 * record needs a wider scope than "own".
 */
export function canRecordMilestone(
  actor: Actor,
  task: TaskAssignment,
  part: Part,
  existing: { recordedById: string } | null,
): boolean {
  if (!inScope(actor, "TASK_RECORD", [agentOfPart(task, part)])) return false;
  if (!existing || existing.recordedById === actor.id) return true;
  return scopeOf(actor, "TASK_RECORD") !== "SELF";
}

export function canAssignTask(actor: Actor, task: TaskAssignment): boolean {
  if (!can(actor, "TASK_ASSIGN")) return false;
  const agents = taskAgentIds(task);
  return agents.length === 0 || inScope(actor, "TASK_ASSIGN", agents);
}

/** Assigning to an agent (or clearing with null) has to stay inside the scope. */
export function canAssignToAgent(actor: Actor, agentId: string | null): boolean {
  if (!can(actor, "TASK_ASSIGN")) return false;
  return agentId === null || inScope(actor, "TASK_ASSIGN", [agentId]);
}

/** Roster rows are about one agent. */
export function canViewRosterOf(actor: Actor, userId: string): boolean {
  return inScope(actor, "ROSTER_VIEW", [userId]);
}

// Thin, readable wrappers over `can`. They check permissions, never role names.
export const canManageFlights = (actor: Actor) => can(actor, "FLIGHT_MANAGE");
export const canAssignTasks = (actor: Actor) => can(actor, "TASK_ASSIGN");
export const canViewOwnTasks = (actor: Actor) => can(actor, "TASK_VIEW");
export const canViewBoard = (actor: Actor) => can(actor, "BOARD_VIEW");
export const canViewRoster = (actor: Actor) => can(actor, "ROSTER_VIEW") || can(actor, "ROSTER_DRAFT");
export const canEditDraftRoster = (actor: Actor) => can(actor, "ROSTER_DRAFT");
export const canPublishRoster = (actor: Actor) => can(actor, "ROSTER_PUBLISH");
export const canEditActualRoster = (actor: Actor) => can(actor, "ROSTER_ACTUAL_EDIT");
export const canManageSegmentTypes = (actor: Actor) => can(actor, "SEGMENT_TYPE_MANAGE");
export const canManageUsers = (actor: Actor) => can(actor, "USER_MANAGE");
export const canManageRoles = (actor: Actor) => can(actor, "ROLE_MANAGE");
export const canManageTeams = (actor: Actor) => can(actor, "TEAM_MANAGE");
export const canManageAirlines = (actor: Actor) => can(actor, "AIRLINE_MANAGE");
export const canManageSettings = (actor: Actor) => can(actor, "SETTINGS_MANAGE");

const ROUTE_PERMISSIONS: [prefix: string, permissions: Permission[]][] = [
  ["/admin/users", ["USER_MANAGE"]],
  ["/admin/roles", ["ROLE_MANAGE"]],
  ["/admin/teams", ["TEAM_MANAGE"]],
  ["/admin/airlines", ["AIRLINE_MANAGE"]],
  ["/admin/templates", ["AIRLINE_MANAGE"]],
  ["/admin/settings", ["SETTINGS_MANAGE"]],
  ["/admin", ["USER_MANAGE", "ROLE_MANAGE", "TEAM_MANAGE", "AIRLINE_MANAGE", "SETTINGS_MANAGE"]],
  ["/flights", ["FLIGHT_MANAGE"]],
  ["/shifts", ["ROSTER_VIEW", "ROSTER_DRAFT"]],
  ["/board", ["BOARD_VIEW"]],
  ["/agent", ["TASK_VIEW"]],
];

/** Whether any admin area is open to the actor. */
export function canOpenAdmin(actor: Actor): boolean {
  return canManageUsers(actor) || canManageRoles(actor) || canManageTeams(actor) || canManageAirlines(actor) || canManageSettings(actor);
}

/** Route-level check used by the proxy; pages and actions check again. */
export function canAccessPath(actor: Actor, pathname: string): boolean {
  const rule = ROUTE_PERMISSIONS.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return !rule || rule[1].some((permission) => can(actor, permission));
}

/** Where a user lands after signing in; "/" when they have no page at all. */
export function homePathFor(actor: Actor): string {
  if (can(actor, "FLIGHT_MANAGE")) return "/flights";
  if (can(actor, "ROSTER_VIEW") || can(actor, "ROSTER_DRAFT")) return "/shifts";
  if (can(actor, "TASK_VIEW")) return "/agent";
  if (canAccessPath(actor, "/admin")) return "/admin";
  return "/";
}
