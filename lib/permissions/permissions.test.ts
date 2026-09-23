import { describe, expect, it } from "vitest";
import {
  assignedParts,
  can,
  canAccessPath,
  canAssignToAgent,
  canAssignTask,
  canChangeTaskStatus,
  canRecordMilestone,
  canViewRosterOf,
  canViewTask,
  DEFAULT_ROLES,
  effectivePermissions,
  homePathFor,
  INDIVIDUAL_SOURCE,
  inScope,
  scopeOf,
  type Actor,
  type TaskAssignment,
} from "@/lib/permissions";

function roleGrant(name: string) {
  const role = DEFAULT_ROLES.find((r) => r.name === name)!;
  return {
    name: role.name,
    permissions: Object.entries(role.permissions).map(([permission, scope]) => ({
      permission: permission as never,
      scope: scope as never,
    })),
  };
}

/** An actor with the given default roles. */
function actorWith(id: string, roleNames: string[], teamMemberIds: string[] = []): Actor {
  return {
    id,
    permissions: effectivePermissions({ roles: roleNames.map(roleGrant), individual: [] }),
    teamMemberIds,
  };
}

const admin = actorWith("admin", ["Admin"]);
const planner = actorWith("planner", ["Tervező"]);
const lead = actorWith("lead", ["Műszakvezető"]);
const anna = actorWith("anna", ["Ügynök"]);
const bela = actorWith("bela", ["Ügynök"]);
// A team leader: agent permissions, but over their team.
const teamLeader: Actor = {
  id: "cili",
  permissions: effectivePermissions({
    roles: [roleGrant("Ügynök")],
    individual: [
      { permission: "TASK_VIEW", scope: "TEAM" },
      { permission: "ROSTER_VIEW", scope: "TEAM" },
    ],
  }),
  teamMemberIds: ["anna"],
};

const longTask: TaskAssignment = { arrivalAgentId: "anna", departureAgentId: "bela", type: "LONG" };
const quickTask: TaskAssignment = { ...longTask, type: "QUICK" };
const unassigned: TaskAssignment = { arrivalAgentId: null, departureAgentId: null, type: "QUICK" };

describe("effective permissions", () => {
  it("takes the union of the roles and keeps every source", () => {
    const permissions = effectivePermissions({
      roles: [
        { name: "A", permissions: [{ permission: "TASK_VIEW", scope: "SELF" }] },
        { name: "B", permissions: [{ permission: "TASK_VIEW", scope: "TEAM" }] },
      ],
      individual: [],
    });
    expect(permissions).toHaveLength(1);
    expect(permissions[0].scope).toBe("TEAM");
    expect(permissions[0].sources.map((s) => s.source)).toEqual(["A", "B"]);
  });

  it("lets an individual grant widen a role's scope, and names the source", () => {
    const permissions = effectivePermissions({
      roles: [{ name: "Ügynök", permissions: [{ permission: "TASK_VIEW", scope: "SELF" }] }],
      individual: [{ permission: "TASK_VIEW", scope: "ALL" }],
    });
    expect(permissions[0].scope).toBe("ALL");
    expect(permissions[0].sources.at(-1)).toEqual({ source: INDIVIDUAL_SOURCE, scope: "ALL" });
  });

  it("never narrows: a narrower individual grant leaves the role scope", () => {
    const permissions = effectivePermissions({
      roles: [{ name: "Vezető", permissions: [{ permission: "TASK_VIEW", scope: "ALL" }] }],
      individual: [{ permission: "TASK_VIEW", scope: "SELF" }],
    });
    expect(permissions[0].scope).toBe("ALL");
  });
});

describe("scopes", () => {
  it("matches own, team and all", () => {
    expect(inScope(anna, "TASK_VIEW", ["anna"])).toBe(true);
    expect(inScope(anna, "TASK_VIEW", ["bela"])).toBe(false);
    expect(inScope(teamLeader, "TASK_VIEW", ["anna"])).toBe(true);
    expect(inScope(teamLeader, "TASK_VIEW", ["bela"])).toBe(false);
    expect(inScope(lead, "TASK_VIEW", ["bela"])).toBe(true);
  });

  it("returns false without the permission", () => {
    expect(inScope(planner, "TASK_VIEW", ["anna"])).toBe(false);
    expect(scopeOf(planner, "TASK_VIEW")).toBeNull();
  });
});

describe("default roles keep the current behaviour", () => {
  it("gives the admin everything", () => {
    expect(can(admin, "USER_MANAGE")).toBe(true);
    expect(can(admin, "ROSTER_PUBLISH")).toBe(true);
    expect(canViewTask(admin, longTask)).toBe(true);
  });

  it("lets the shift lead work with every task and flight", () => {
    expect(can(lead, "FLIGHT_MANAGE")).toBe(true);
    expect(canViewTask(lead, longTask)).toBe(true);
    expect(canRecordMilestone(lead, longTask, "DEPARTURE_PART", { recordedById: "anna" })).toBe(true);
    expect(can(lead, "USER_MANAGE")).toBe(false);
  });

  it("keeps the agent on their own tasks and parts", () => {
    expect(canViewTask(anna, longTask)).toBe(true);
    expect(canViewTask(anna, { ...longTask, arrivalAgentId: "cili" })).toBe(false);
    expect(canRecordMilestone(anna, longTask, "ARRIVAL_PART", null)).toBe(true);
    expect(canRecordMilestone(anna, longTask, "DEPARTURE_PART", null)).toBe(false);
    expect(canRecordMilestone(bela, longTask, "DEPARTURE_PART", null)).toBe(true);
    expect(can(anna, "FLIGHT_MANAGE")).toBe(false);
  });

  it("gives both parts of a quick turnaround to the arrival agent", () => {
    expect(assignedParts(anna, quickTask)).toEqual(["ARRIVAL_PART", "DEPARTURE_PART"]);
    expect(canViewTask(bela, quickTask)).toBe(false);
    expect(canRecordMilestone(anna, quickTask, "DEPARTURE_PART", null)).toBe(true);
  });

  it("lets an agent correct only their own record", () => {
    expect(canRecordMilestone(anna, longTask, "ARRIVAL_PART", { recordedById: "anna" })).toBe(true);
    expect(canRecordMilestone(anna, longTask, "ARRIVAL_PART", { recordedById: "lead" })).toBe(false);
  });

  it("lets the assigned agent change the status", () => {
    expect(canChangeTaskStatus(anna, longTask)).toBe(true);
    expect(canChangeTaskStatus(teamLeader, longTask)).toBe(false);
  });

  it("gives the planner the roster but no tasks", () => {
    expect(can(planner, "ROSTER_DRAFT")).toBe(true);
    expect(can(planner, "ROSTER_PUBLISH")).toBe(true);
    expect(can(planner, "FLIGHT_MANAGE")).toBe(false);
    expect(canViewTask(planner, longTask)).toBe(false);
  });
});

describe("assignment", () => {
  it("shows unassigned tasks to anyone who may assign", () => {
    expect(canViewTask(lead, unassigned)).toBe(true);
    expect(canViewTask(anna, unassigned)).toBe(false);
  });

  it("keeps a team-scoped assigner inside their team", () => {
    const teamAssigner: Actor = {
      id: "dora",
      permissions: effectivePermissions({
        roles: [],
        individual: [{ permission: "TASK_ASSIGN", scope: "TEAM" }],
      }),
      teamMemberIds: ["anna"],
    };
    expect(canAssignTask(teamAssigner, unassigned)).toBe(true);
    expect(canAssignToAgent(teamAssigner, "anna")).toBe(true);
    expect(canAssignToAgent(teamAssigner, "bela")).toBe(false);
    expect(canAssignToAgent(teamAssigner, null)).toBe(true);
    expect(canAssignToAgent(anna, "anna")).toBe(false);
  });
});

describe("roster visibility", () => {
  it("follows the scope of the roster permission", () => {
    expect(canViewRosterOf(lead, "bela")).toBe(true);
    expect(canViewRosterOf(teamLeader, "anna")).toBe(true);
    expect(canViewRosterOf(teamLeader, "bela")).toBe(false);
    expect(canViewRosterOf(anna, "anna")).toBe(false);
  });
});

describe("routes", () => {
  it("guards each area with its permission", () => {
    expect(canAccessPath(anna, "/admin")).toBe(false);
    expect(canAccessPath(anna, "/flights")).toBe(false);
    expect(canAccessPath(anna, "/shifts")).toBe(false);
    expect(canAccessPath(anna, "/agent")).toBe(true);
    expect(canAccessPath(lead, "/flights")).toBe(true);
    expect(canAccessPath(lead, "/shifts")).toBe(true);
    expect(canAccessPath(lead, "/admin")).toBe(false);
    expect(canAccessPath(planner, "/shifts")).toBe(true);
    expect(canAccessPath(planner, "/flights")).toBe(false);
    expect(canAccessPath(admin, "/admin/roles")).toBe(true);
  });

  it("leaves shared routes to object-level checks", () => {
    expect(canAccessPath(anna, "/tasks/123")).toBe(true);
    expect(canAccessPath(anna, "/")).toBe(true);
  });

  it("sends each role to its own home page", () => {
    expect(homePathFor(lead)).toBe("/flights");
    expect(homePathFor(planner)).toBe("/shifts");
    expect(homePathFor(anna)).toBe("/agent");
    expect(homePathFor(admin)).toBe("/flights");
  });
});
