import { describe, expect, it } from "vitest";
import {
  assignedParts,
  can,
  canAccessPath,
  canAssignToAgent,
  canAssignTask,
  canChangeTaskStatus,
  canRecordMilestone,
  canEditLayer,
  canManageMessaging,
  canManageTraining,
  canPlan,
  canRecordDelayCodes,
  canRecordMessages,
  canSendPartMessage,
  canViewFlightMessages,
  canViewLayer,
  canViewPlans,
  canViewLayerOf,
  canViewRosterOf,
  canViewTask,
  canViewTrainingOf,
  DEFAULT_ROLES,
  effectivePermissions,
  homePathFor,
  INDIVIDUAL_SOURCE,
  inScope,
  rosterVisibleUserIds,
  scopeOf,
  trainingVisibleUserIds,
  visibleLayers,
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

describe("roster layers", () => {
  it("shows the draft only to whoever may plan", () => {
    expect(visibleLayers(planner)).toEqual(["DRAFT", "PUBLISHED", "ACTUAL"]);
    expect(visibleLayers(admin)).toEqual(["DRAFT", "PUBLISHED", "ACTUAL"]);
    expect(visibleLayers(lead)).toEqual(["PUBLISHED", "ACTUAL"]);
    expect(visibleLayers(anna)).toEqual([]);
    expect(canViewLayer(lead, "DRAFT")).toBe(false);
  });

  it("locks the published layer for everyone", () => {
    for (const actor of [admin, planner, lead]) {
      expect(canEditLayer(actor, "PUBLISHED")).toBe(false);
    }
  });

  it("lets the planner edit the draft and both of them the actual roster", () => {
    expect(canEditLayer(planner, "DRAFT")).toBe(true);
    expect(canEditLayer(lead, "DRAFT")).toBe(false);
    expect(canEditLayer(planner, "ACTUAL")).toBe(true);
    expect(canEditLayer(lead, "ACTUAL")).toBe(true);
    expect(canEditLayer(anna, "ACTUAL")).toBe(false);
  });

  it("limits a team-scoped viewer to their own team", () => {
    expect(rosterVisibleUserIds(lead)).toBeNull();
    expect(rosterVisibleUserIds(planner)).toBeNull();
    expect(rosterVisibleUserIds(teamLeader)).toEqual(["cili", "anna"]);
    expect(rosterVisibleUserIds(anna)).toEqual([]);
    expect(canViewLayerOf(teamLeader, "ACTUAL", "anna")).toBe(true);
    expect(canViewLayerOf(teamLeader, "ACTUAL", "bela")).toBe(false);
    expect(canViewLayerOf(teamLeader, "DRAFT", "anna")).toBe(false);
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

  it("gives the schedule import to the planner and the admin", () => {
    expect(canAccessPath(planner, "/import")).toBe(true);
    expect(canAccessPath(admin, "/import")).toBe(true);
    expect(canAccessPath(lead, "/import")).toBe(false);
    expect(canAccessPath(anna, "/import")).toBe(false);
  });

  it("gives planning to the planner and the admin; the shift lead reads the plan to take its assignment over", () => {
    expect(canPlan(planner)).toBe(true);
    expect(canPlan(admin)).toBe(true);
    expect(canPlan(lead)).toBe(false);
    expect(canPlan(anna)).toBe(false);
    expect(canAccessPath(planner, "/planning")).toBe(true);
    expect(canAccessPath(lead, "/planning")).toBe(true);
    expect(canAccessPath(lead, "/planning/settings")).toBe(false);
    expect(canAccessPath(planner, "/planning/settings")).toBe(true);
    expect(canAccessPath(anna, "/planning")).toBe(false);
    expect(canViewPlans(lead)).toBe(true);
    expect(canViewPlans(anna)).toBe(false);
  });

  it("keeps the segment types with the planner", () => {
    expect(canAccessPath(planner, "/shifts/types")).toBe(true);
    expect(canAccessPath(admin, "/shifts/types")).toBe(true);
    expect(canAccessPath(lead, "/shifts/types")).toBe(false);
    expect(canAccessPath(lead, "/shifts")).toBe(true);
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

describe("training data (6. mérföldkő)", () => {
  const coordinator = actorWith("olga", ["Oktatási koordinátor"]);

  it("lets the coordinator manage and see everyone", () => {
    expect(canManageTraining(coordinator)).toBe(true);
    expect(canViewTrainingOf(coordinator, "anyone")).toBe(true);
    expect(trainingVisibleUserIds(coordinator)).toBeNull();
    expect(canAccessPath(coordinator, "/training/records")).toBe(true);
  });

  it("shows an agent their own data only", () => {
    expect(canManageTraining(anna)).toBe(false);
    expect(canViewTrainingOf(anna, "anna")).toBe(true);
    expect(canViewTrainingOf(anna, "bela")).toBe(false);
    expect(trainingVisibleUserIds(anna)).toEqual(["anna"]);
    expect(canAccessPath(anna, "/training")).toBe(true);
    expect(canAccessPath(anna, "/training/records")).toBe(false);
  });

  it("shows the shift lead the team", () => {
    const leadOfAnna = actorWith("lead", ["Műszakvezető"], ["anna"]);
    expect(canViewTrainingOf(leadOfAnna, "anna")).toBe(true);
    expect(canViewTrainingOf(leadOfAnna, "bela")).toBe(false);
    expect(trainingVisibleUserIds(leadOfAnna)).toEqual(["lead", "anna"]);
    expect(canManageTraining(lead)).toBe(false);
    expect(canAccessPath(lead, "/training/qualifications")).toBe(false);
  });
});

describe("messages (7. mérföldkő)", () => {
  it("shows an agent the messages of the flights of their tasks", () => {
    expect(canViewFlightMessages(anna, ["anna", "bela"])).toBe(true);
    expect(canViewFlightMessages(anna, ["bela", null])).toBe(false);
    expect(canViewFlightMessages(lead, [null])).toBe(true);
    expect(canViewFlightMessages(planner, ["anna"])).toBe(false);
  });

  it("lets an agent send on their own part only", () => {
    expect(canSendPartMessage(bela, ["bela"])).toBe(true);
    expect(canSendPartMessage(anna, ["bela"])).toBe(false);
    expect(canSendPartMessage(lead, [null])).toBe(true);
  });

  it("keeps pasting, the unmatched list and the settings to the shift lead and the admin", () => {
    expect(canRecordMessages(lead)).toBe(true);
    expect(canRecordMessages(anna)).toBe(false);
    expect(canAccessPath(anna, "/messages")).toBe(false);
    expect(canAccessPath(lead, "/messages/unmatched")).toBe(true);
    expect(canManageMessaging(admin)).toBe(true);
    expect(canManageMessaging(lead)).toBe(false);
    expect(canAccessPath(lead, "/admin/messaging")).toBe(false);
    expect(canAccessPath(admin, "/admin/messaging")).toBe(true);
  });

  it("lets delay codes be recorded by flight managers and the departure agents", () => {
    expect(canRecordDelayCodes(lead, [null])).toBe(true);
    expect(canRecordDelayCodes(bela, ["bela"])).toBe(true);
    expect(canRecordDelayCodes(anna, ["bela"])).toBe(false);
    expect(canRecordDelayCodes(planner, ["planner"])).toBe(false);
  });
});
