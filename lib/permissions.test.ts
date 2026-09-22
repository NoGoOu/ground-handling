import { describe, expect, it } from "vitest";
import {
  assignedParts,
  canAccessPath,
  canAdminister,
  canAssignAgents,
  canChangeTaskStatus,
  canManageFlights,
  canRecordMilestone,
  canViewTask,
  homePathFor,
  type Actor,
  type TaskAssignment,
} from "@/lib/permissions";

const admin: Actor = { id: "admin", role: "ADMIN" };
const lead: Actor = { id: "lead", role: "SHIFT_LEAD" };
const anna: Actor = { id: "anna", role: "AGENT" };
const bela: Actor = { id: "bela", role: "AGENT" };
const cili: Actor = { id: "cili", role: "AGENT" };

const longTask: TaskAssignment = { arrivalAgentId: "anna", departureAgentId: "bela", type: "LONG" };
// Same assignment, but the late arrival turned it into a quick turnaround.
const quickTask: TaskAssignment = { ...longTask, type: "QUICK" };

describe("routes", () => {
  it("sends each role to its home page", () => {
    expect(homePathFor("AGENT")).toBe("/agent");
    expect(homePathFor("SHIFT_LEAD")).toBe("/flights");
    expect(homePathFor("ADMIN")).toBe("/flights");
  });

  it("restricts route prefixes by role", () => {
    expect(canAccessPath("AGENT", "/admin")).toBe(false);
    expect(canAccessPath("AGENT", "/admin/users")).toBe(false);
    expect(canAccessPath("SHIFT_LEAD", "/admin/templates/x")).toBe(false);
    expect(canAccessPath("ADMIN", "/admin/users")).toBe(true);
    expect(canAccessPath("AGENT", "/flights")).toBe(false);
    expect(canAccessPath("SHIFT_LEAD", "/flights/new")).toBe(true);
    expect(canAccessPath("SHIFT_LEAD", "/agent")).toBe(false);
    expect(canAccessPath("AGENT", "/agent")).toBe(true);
  });

  it("leaves shared routes to object-level checks", () => {
    expect(canAccessPath("AGENT", "/tasks/123")).toBe(true);
    expect(canAccessPath("AGENT", "/")).toBe(true);
    expect(canAccessPath("AGENT", "/administrator")).toBe(true);
  });
});

describe("role capabilities", () => {
  it("lets managers handle flights and assignments, and only admins administer", () => {
    expect([admin, lead, anna].map(canManageFlights)).toEqual([true, true, false]);
    expect([admin, lead, anna].map(canAssignAgents)).toEqual([true, true, false]);
    expect([admin, lead, anna].map(canAdminister)).toEqual([true, false, false]);
  });
});

describe("task visibility", () => {
  it("shows every task to managers", () => {
    expect(canViewTask(admin, longTask)).toBe(true);
    expect(canViewTask(lead, longTask)).toBe(true);
  });

  it("shows a task to its assigned agents only", () => {
    expect(canViewTask(anna, longTask)).toBe(true);
    expect(canViewTask(bela, longTask)).toBe(true);
    expect(canViewTask(cili, longTask)).toBe(false);
  });

  it("moves the departure part to the arrival agent on a quick turnaround", () => {
    expect(assignedParts(anna, quickTask)).toEqual(["ARRIVAL_PART", "DEPARTURE_PART"]);
    expect(assignedParts(bela, quickTask)).toEqual([]);
    expect(canViewTask(bela, quickTask)).toBe(false);
  });

  it("lets the assigned agents change the status", () => {
    expect(canChangeTaskStatus(anna, longTask)).toBe(true);
    expect(canChangeTaskStatus(cili, longTask)).toBe(false);
  });
});

describe("recording milestones", () => {
  it("lets managers record and correct anything", () => {
    expect(canRecordMilestone(lead, longTask, "DEPARTURE_PART", { recordedById: "anna" })).toBe(true);
    expect(canRecordMilestone(admin, longTask, "ARRIVAL_PART", null)).toBe(true);
  });

  it("keeps agents to their own part on a long turnaround", () => {
    expect(canRecordMilestone(anna, longTask, "ARRIVAL_PART", null)).toBe(true);
    expect(canRecordMilestone(anna, longTask, "DEPARTURE_PART", null)).toBe(false);
    expect(canRecordMilestone(bela, longTask, "DEPARTURE_PART", null)).toBe(true);
    expect(canRecordMilestone(bela, longTask, "ARRIVAL_PART", null)).toBe(false);
  });

  it("gives both parts to the arrival agent on a quick turnaround", () => {
    expect(canRecordMilestone(anna, quickTask, "DEPARTURE_PART", null)).toBe(true);
    expect(canRecordMilestone(bela, quickTask, "DEPARTURE_PART", null)).toBe(false);
  });

  it("lets an agent correct only their own records", () => {
    expect(canRecordMilestone(anna, longTask, "ARRIVAL_PART", { recordedById: "anna" })).toBe(true);
    expect(canRecordMilestone(anna, longTask, "ARRIVAL_PART", { recordedById: "lead" })).toBe(false);
  });

  it("refuses unassigned agents", () => {
    expect(canRecordMilestone(cili, longTask, "ARRIVAL_PART", null)).toBe(false);
  });
});
