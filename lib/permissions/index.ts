import { effectiveTraineeId } from "@/lib/exams/ojt";
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
  /** Null on a one-sided flight, which has only one part (rule 11). */
  type: TurnaroundType | null;
  /** The trainees next to the agents (10. mérföldkő); none when not given. */
  arrivalTraineeId?: string | null;
  departureTraineeId?: string | null;
}

/** The trainee of a part: on a quick turnaround the arrival trainee does both, like the agent (rule 8). */
export function traineeOfPart(task: TaskAssignment, part: Part): string | null {
  return effectiveTraineeId(task.type, part, { arrival: task.arrivalTraineeId ?? null, departure: task.departureTraineeId ?? null });
}

/** The parts of the task the actor works as a trainee. */
export function traineeParts(actor: Actor, task: TaskAssignment): Part[] {
  return (["ARRIVAL_PART", "DEPARTURE_PART"] as const).filter((part) => traineeOfPart(task, part) === actor.id);
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

/**
 * Whoever may assign tasks also sees the unassigned ones, whatever their scope;
 * a trainee sees the task they practise on (10. mérföldkő).
 */
export function canViewTask(actor: Actor, task: TaskAssignment): boolean {
  const agents = taskAgentIds(task);
  if (agents.length === 0 && can(actor, "TASK_ASSIGN")) return true;
  if (traineeParts(actor, task).length > 0 && can(actor, "TASK_VIEW")) return true;
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
  existing: { recordedById: string; byTrainee?: boolean } | null,
): boolean {
  // The trainee records the milestones of their part and corrects their own records (10. mérföldkő).
  if (traineeOfPart(task, part) === actor.id && can(actor, "TASK_RECORD")) {
    return !existing || existing.recordedById === actor.id;
  }
  if (!inScope(actor, "TASK_RECORD", [agentOfPart(task, part)])) return false;
  if (!existing || existing.recordedById === actor.id) return true;
  // The mentor, the agent of the part, corrects the trainee's records whatever the scope.
  if (existing.byTrainee && agentOfPart(task, part) === actor.id) return true;
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

export const ROSTER_LAYERS = ["DRAFT", "PUBLISHED", "ACTUAL"] as const;
export type RosterLayerName = (typeof ROSTER_LAYERS)[number];

/**
 * The draft is the planner's workspace, so only they and the admin see it; the
 * other two layers follow the roster permission (CLAUDE.md, "Beosztás rétegei").
 */
export function canViewLayer(actor: Actor, layer: RosterLayerName): boolean {
  if (layer === "DRAFT") return can(actor, "ROSTER_DRAFT");
  return can(actor, "ROSTER_VIEW") || can(actor, "ROSTER_DRAFT");
}

export function visibleLayers(actor: Actor): RosterLayerName[] {
  return ROSTER_LAYERS.filter((layer) => canViewLayer(actor, layer));
}

/** A roster row belongs to one agent, so the scope of ROSTER_VIEW applies too. */
export function canViewLayerOf(actor: Actor, layer: RosterLayerName, userId: string): boolean {
  if (layer === "DRAFT") return can(actor, "ROSTER_DRAFT");
  return can(actor, "ROSTER_DRAFT") || canViewRosterOf(actor, userId);
}

/** The published layer is locked once published; changes go to the actual one. */
export function canEditLayer(actor: Actor, layer: RosterLayerName): boolean {
  if (layer === "DRAFT") return can(actor, "ROSTER_DRAFT");
  if (layer === "ACTUAL") return can(actor, "ROSTER_ACTUAL_EDIT");
  return false;
}

/** Agents whose roster the actor may read; null means everyone. */
export function rosterVisibleUserIds(actor: Actor): string[] | null {
  if (can(actor, "ROSTER_DRAFT")) return null;
  const scope = scopeOf(actor, "ROSTER_VIEW");
  if (!scope) return [];
  if (scope === "ALL") return null;
  if (scope === "TEAM") return [actor.id, ...actor.teamMemberIds];
  return [actor.id];
}

// Thin, readable wrappers over `can`. They check permissions, never role names.
export const canManageFlights = (actor: Actor) => can(actor, "FLIGHT_MANAGE");
export const canImportSchedule = (actor: Actor) => can(actor, "SCHEDULE_IMPORT");
export const canAssignTasks = (actor: Actor) => can(actor, "TASK_ASSIGN");
export const canViewOwnTasks = (actor: Actor) => can(actor, "TASK_VIEW");
export const canViewBoard = (actor: Actor) => can(actor, "BOARD_VIEW");
export const canViewRoster = (actor: Actor) => can(actor, "ROSTER_VIEW") || can(actor, "ROSTER_DRAFT");
export const canEditDraftRoster = (actor: Actor) => can(actor, "ROSTER_DRAFT");
export const canPublishRoster = (actor: Actor) => can(actor, "ROSTER_PUBLISH");
export const canEditActualRoster = (actor: Actor) => can(actor, "ROSTER_ACTUAL_EDIT");
export const canManageSegmentTypes = (actor: Actor) => can(actor, "SEGMENT_TYPE_MANAGE");
/** Planner view: calculating, settings, names and saving into the draft (4. mérföldkő). */
export const canPlan = (actor: Actor) => can(actor, "PLANNING");
/** The staffing demand (9. mérföldkő): without a scope, it always counts every flight. */
export const canViewStaffing = (actor: Actor) => can(actor, "STAFFING_VIEW");
/** Qualifications, trainings, records and files (6. mérföldkő). */
export const canManageTraining = (actor: Actor) => can(actor, "TRAINING_MANAGE");
export const canViewTraining = (actor: Actor) => can(actor, "TRAINING_VIEW") || can(actor, "TRAINING_MANAGE");

// E-exams, on the job training and release (10. mérföldkő). Whether a mentor's
// or an examiner's qualification is valid on the day is checked apart (lib/exams).

/** Question bank, exam sheets, practical criteria, the parts of a training and its OJT requirement. */
export const canEditExams = (actor: Actor) => can(actor, "EXAM_EDIT");
export const canMentor = (actor: Actor) => can(actor, "MENTORING");
/** Scoring written answers and the practical exam. */
export const canExamine = (actor: Actor) => can(actor, "EXAMINING");
export const canRelease = (actor: Actor) => can(actor, "RELEASE");
/** Opening an e-exam for the examinee is organising, not judging: examiners and the coordinator. */
export const canOpenExamAttempt = (actor: Actor) => can(actor, "EXAMINING") || can(actor, "TRAINING_MANAGE");
/** The internal notes of the exams: for examiners, releasers and the coordinator only. */
export const canSeeInternalNotes = (actor: Actor) =>
  can(actor, "EXAMINING") || can(actor, "RELEASE") || can(actor, "TRAINING_MANAGE");

/**
 * A training process and its results: by the scope of viewing training data,
 * and for whoever examines, releases or manages trainings, everyone's.
 */
export function canViewProcessOf(actor: Actor, userId: string): boolean {
  return canViewTrainingOf(actor, userId) || canSeeInternalNotes(actor);
}

/** Whose processes the actor may list; null means everyone. */
export function processVisibleUserIds(actor: Actor): string[] | null {
  return canSeeInternalNotes(actor) ? null : trainingVisibleUserIds(actor);
}

/** The training area: training data, the exams, examining and release. */
export function canOpenTrainingArea(actor: Actor): boolean {
  return canViewTraining(actor) || canSeeInternalNotes(actor) || canEditExams(actor);
}

/** One person's training data and files: the coordinator sees everyone, the others by scope. */
export function canViewTrainingOf(actor: Actor, userId: string): boolean {
  return can(actor, "TRAINING_MANAGE") || inScope(actor, "TRAINING_VIEW", [userId]);
}

/** Whose training data the actor may see; null means everyone. */
export function trainingVisibleUserIds(actor: Actor): string[] | null {
  if (can(actor, "TRAINING_MANAGE")) return null;
  const scope = scopeOf(actor, "TRAINING_VIEW");
  if (!scope) return [];
  if (scope === "ALL") return null;
  if (scope === "TEAM") return [actor.id, ...actor.teamMemberIds];
  return [actor.id];
}
/**
 * The messages of a flight (7. mérföldkő): the agents are those of all its
 * tasks, so an agent sees the messages of the flights of their tasks.
 */
export function canViewFlightMessages(actor: Actor, flightAgentIds: readonly (string | null)[]): boolean {
  return inScope(actor, "MESSAGE_VIEW", flightAgentIds);
}

/** Manual pasting and the unmatched messages. */
export const canRecordMessages = (actor: Actor) => can(actor, "MESSAGE_RECORD");

/** Sending a message of a flight part: the agents are those of that part in the flight's tasks. */
export function canSendPartMessage(actor: Actor, partAgentIds: readonly (string | null)[]): boolean {
  return inScope(actor, "MESSAGE_SEND", partAgentIds);
}

/** API keys, address book, delay codes, sender addresses. */
export const canManageMessaging = (actor: Actor) => can(actor, "MESSAGING_SETTINGS");

/**
 * Delay codes on the departure part: whoever manages flights, and whoever
 * records on that part (the departure agents of the flight's tasks).
 */
export function canRecordDelayCodes(actor: Actor, departureAgentIds: readonly (string | null)[]): boolean {
  return can(actor, "FLIGHT_MANAGE") || inScope(actor, "TASK_RECORD", departureAgentIds);
}

/**
 * The airline's delay code document, opened from a flight (8. mérföldkő,
 * utómunka): whoever sees one of the flight's tasks, whoever manages flights
 * (the "Késés rögzítése" form shows it) and whoever uploads the documents.
 */
export function canOpenDelayDocument(actor: Actor, flightTasks: readonly TaskAssignment[]): boolean {
  return canManageMessaging(actor) || canManageFlights(actor) || flightTasks.some((task) => canViewTask(actor, task));
}

// Ground equipment and faults (11. mérföldkő).

/** Equipment types and their fields, equipment, technical data and documents. */
export const canManageEquipment = (actor: Actor) => can(actor, "EQUIPMENT_MANAGE");
/** Taking over, commenting, closing, and setting an equipment back to operational. */
export const canManageFaults = (actor: Actor) => can(actor, "FAULT_MANAGE");
export const canReportFault = (actor: Actor) => can(actor, "FAULT_REPORT");

/**
 * The equipment list and data sheets: the technical staff, and whoever sees
 * every fault (the shift lead sees the state of the equipment).
 */
export function canViewEquipment(actor: Actor): boolean {
  return canManageEquipment(actor) || canManageFaults(actor) || scopeOf(actor, "FAULT_VIEW") === "ALL";
}

/** The faults area: whoever reports, handles or views faults. */
export function canOpenFaults(actor: Actor): boolean {
  return canReportFault(actor) || canManageFaults(actor) || can(actor, "FAULT_VIEW");
}

/** A fault: its reporter always, the others by the scope of viewing faults. */
export function canViewFault(actor: Actor, fault: { reportedById: string }): boolean {
  return fault.reportedById === actor.id || canManageFaults(actor) || inScope(actor, "FAULT_VIEW", [fault.reportedById]);
}

/** Whose faults the actor may list, by reporter; null means everyone's. */
export function faultVisibleReporterIds(actor: Actor): string[] | null {
  if (canManageFaults(actor)) return null;
  const scope = scopeOf(actor, "FAULT_VIEW");
  if (scope === "ALL") return null;
  if (scope === "TEAM") return [actor.id, ...actor.teamMemberIds];
  return [actor.id];
}

/** The plan is read by whoever plans or takes its assignment over onto the tasks. */
export const canViewPlans = (actor: Actor) => can(actor, "PLANNING") || can(actor, "TASK_ASSIGN");
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
  ["/admin/task-types", ["AIRLINE_MANAGE"]],
  ["/admin/settings", ["SETTINGS_MANAGE"]],
  ["/admin/messaging", ["MESSAGING_SETTINGS"]],
  ["/admin", ["USER_MANAGE", "ROLE_MANAGE", "TEAM_MANAGE", "AIRLINE_MANAGE", "SETTINGS_MANAGE", "MESSAGING_SETTINGS"]],
  ["/messages", ["MESSAGE_RECORD"]],
  ["/flights", ["FLIGHT_MANAGE"]],
  ["/import", ["SCHEDULE_IMPORT"]],
  ["/planning/settings", ["PLANNING"]],
  ["/training/exams", ["EXAM_EDIT"]],
  ["/training/attempts", ["EXAMINING", "RELEASE", "TRAINING_MANAGE"]],
  ["/training/processes", ["TRAINING_VIEW", "TRAINING_MANAGE", "EXAMINING", "RELEASE"]],
  ["/training/qualifications", ["TRAINING_MANAGE"]],
  ["/training/courses", ["TRAINING_MANAGE"]],
  ["/training/records", ["TRAINING_MANAGE"]],
  ["/training/expiring", ["TRAINING_MANAGE", "TRAINING_VIEW"]],
  ["/training", ["TRAINING_VIEW", "TRAINING_MANAGE", "EXAMINING", "RELEASE", "EXAM_EDIT"]],
  ["/planning", ["PLANNING", "TASK_ASSIGN"]],
  ["/shifts/types", ["SEGMENT_TYPE_MANAGE"]],
  ["/shifts", ["ROSTER_VIEW", "ROSTER_DRAFT"]],
  ["/board", ["BOARD_VIEW"]],
  ["/staffing", ["STAFFING_VIEW"]],
  ["/equipment", ["EQUIPMENT_MANAGE", "FAULT_MANAGE", "FAULT_VIEW"]],
  ["/faults", ["FAULT_REPORT", "FAULT_VIEW", "FAULT_MANAGE"]],
  // The agent's own roster (12. mérföldkő).
  ["/agent/roster", ["ROSTER_VIEW"]],
  ["/agent", ["TASK_VIEW"]],
];

/** Whether any admin area is open to the actor. */
export function canOpenAdmin(actor: Actor): boolean {
  return (
    canManageUsers(actor) ||
    canManageRoles(actor) ||
    canManageTeams(actor) ||
    canManageAirlines(actor) ||
    canManageSettings(actor) ||
    canManageMessaging(actor)
  );
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
  // Seeing only their own roster does not take an agent off their tasks (12. mérföldkő).
  const rosterScope = scopeOf(actor, "ROSTER_VIEW");
  if (can(actor, "ROSTER_DRAFT") || (rosterScope && rosterScope !== "SELF")) return "/shifts";
  if (can(actor, "TASK_VIEW")) return "/agent";
  if (rosterScope) return "/shifts";
  if (canAccessPath(actor, "/admin")) return "/admin";
  return "/";
}
