"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import { getTaskView, taskAssignment } from "@/lib/data/tasks";
import { findAssignableAgent } from "@/lib/data/users";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { canAssignTask, canAssignTasks, canAssignToAgent, canManageFlights } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { toLocalDate } from "@/lib/time";
import type { Part } from "@/lib/turnaround";
import { FLIGHT_FIELDS, flightSchema, type FlightFormInput } from "@/lib/validation/flight";
import { fieldErrors, formValues, type FormState } from "@/lib/validation/form";

export type FlightFormState = FormState<FlightFormInput>;

const e = messages.flightForm.errors;

async function isAllowed(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user && canManageFlights(user);
}

async function parse(formData: FormData) {
  const values = formValues(formData, FLIGHT_FIELDS);
  const parsed = flightSchema.safeParse(values);
  if (!parsed.success) return { values, state: { errors: fieldErrors(parsed.error), values } };
  const template = await prisma.turnaroundTemplate.findUnique({
    where: { id: parsed.data.templateId },
    select: { airlineId: true },
  });
  if (!template) return { values, state: { errors: { templateId: e.template }, values } };
  return { values, data: { ...parsed.data, airlineId: template.airlineId } };
}

/** The daily list to return to: the arrival day, or the departure day of a departure-only flight. */
function listDay(flight: { sta: Date | null; std: Date | null }): string {
  return toLocalDate((flight.sta ?? flight.std)!);
}

/** Creates the flight together with its task (CLAUDE.md: one task per flight, created automatically). */
export async function createFlight(_previous: FlightFormState, formData: FormData): Promise<FlightFormState> {
  if (!(await isAllowed())) return { message: messages.errors.forbidden };
  const result = await parse(formData);
  if (!result.data) return result.state;

  const flight = await prisma.flight.create({
    data: { ...result.data, task: { create: {} } },
  });
  redirect(`/flights?date=${listDay(flight)}`);
}

export async function updateFlight(
  flightId: string,
  _previous: FlightFormState,
  formData: FormData,
): Promise<FlightFormState> {
  if (!(await isAllowed())) return { message: messages.errors.forbidden };
  const existing = await prisma.flight.findUnique({
    where: { id: flightId },
    select: {
      templateId: true,
      sta: true,
      std: true,
      ata: true,
      atd: true,
      task: { select: { id: true, records: { select: { milestoneDefinition: { select: { part: true } } } } } },
    },
  });
  if (!existing) return { message: messages.errors.notFound };

  const result = await parse(formData);
  if (!result.data) return result.state;

  // Decision 6 (CLAUDE.md): records point at the template's milestones.
  const records = existing.task?.records ?? [];
  if (records.length > 0 && result.data.templateId !== existing.templateId) {
    return { errors: { templateId: e.templateLocked }, values: result.values };
  }

  // A part that has already happened (a record, or a time from the external
  // system) cannot be dropped: its milestones would silently disappear.
  const recordedParts = new Set<Part>(records.map((r) => r.milestoneDefinition.part));
  const dropsArrival = !!existing.sta && !result.data.sta;
  const dropsDeparture = !!existing.std && !result.data.std;
  if (dropsArrival && (existing.ata || recordedParts.has("ARRIVAL_PART"))) {
    return { errors: { sta: e.partInUse }, values: result.values };
  }
  if (dropsDeparture && (existing.atd || recordedParts.has("DEPARTURE_PART"))) {
    return { errors: { std: e.partInUse }, values: result.values };
  }

  const flight = await prisma.$transaction(async (tx) => {
    const updated = await tx.flight.update({ where: { id: flightId }, data: result.data });
    // A dropped part takes its agent with it (a one-sided task has one agent).
    if (existing.task && (dropsArrival || dropsDeparture)) {
      await tx.task.update({
        where: { id: existing.task.id },
        data: {
          ...(dropsArrival ? { arrivalAgentId: null } : {}),
          ...(dropsDeparture ? { departureAgentId: null } : {}),
        },
      });
    }
    return updated;
  });
  redirect(`/flights?date=${listDay(flight)}`);
}

async function agentIdFrom(formData: FormData, key: string): Promise<string | null> {
  const value = formData.get(key);
  if (typeof value !== "string" || value === "") return null;
  const agent = await findAssignableAgent(value);
  if (!agent) throw new ActionError(messages.assignment.invalidAgent);
  return agent.id;
}

/**
 * Assigns agents to the parts of a task. On a quick turnaround the arrival
 * agent does both parts (rule 8), so the departure part follows the arrival
 * agent; a one-sided flight has only the agent of its own part (rule 11).
 */
export async function assignAgents(
  taskId: string,
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actionUser(canAssignTasks);
    const task = await getTaskView(taskId);
    if (!task) throw new ActionError(messages.errors.notFound);
    if (!canAssignTask(actor, taskAssignment(task))) throw new ActionError(messages.errors.forbidden);

    const { kind, shape } = task.timeline;
    const arrivalAgentId = kind === "DEPARTURE_ONLY" ? null : await agentIdFrom(formData, "arrivalAgentId");
    const departureAgentId =
      kind === "ARRIVAL_ONLY"
        ? null
        : shape.type === "QUICK"
          ? arrivalAgentId
          : await agentIdFrom(formData, "departureAgentId");

    // Assigning has to stay inside the actor's scope.
    if (![arrivalAgentId, departureAgentId].every((id) => canAssignToAgent(actor, id))) {
      throw new ActionError(messages.errors.forbidden);
    }

    await prisma.task.update({ where: { id: taskId }, data: { arrivalAgentId, departureAgentId } });
    refresh();
  });
}
