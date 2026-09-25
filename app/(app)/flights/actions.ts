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
import { DELAY_FIELDS, delayPartErrors, delaySchema, type DelayFormInput } from "@/lib/validation/delay";
import { FLIGHT_FIELDS, flightSchema, type FlightFormInput } from "@/lib/validation/flight";
import { fieldErrors, formValues, type FormState } from "@/lib/validation/form";

export type FlightFormState = FormState<FlightFormInput>;
export type DelayFormState = FormState<DelayFormInput>;

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
    select: { airlineId: true, taskTypeId: true },
  });
  if (!template) return { values, state: { errors: { templateId: e.template }, values } };
  const { templateId, ...flight } = parsed.data;
  // The template is the task's (5. mérföldkő); the flight gets the airline.
  return { values, data: { ...flight, airlineId: template.airlineId }, task: { templateId, taskTypeId: template.taskTypeId } };
}

/** What a dropped part takes with it: its estimate and its cancellation. */
const DROPPED_ARRIVAL = {
  eta: null,
  etaSource: null,
  etaNote: null,
  etaRecordedById: null,
  etaRecordedAt: null,
  arrivalCancelled: false,
  arrivalCancelledById: null,
  arrivalCancelledAt: null,
};
const DROPPED_DEPARTURE = {
  etd: null,
  etdSource: null,
  etdNote: null,
  etdRecordedById: null,
  etdRecordedAt: null,
  departureCancelled: false,
  departureCancelledById: null,
  departureCancelledAt: null,
};

/** The daily list to return to: the arrival day, or the departure day of a departure-only flight. */
function listDay(flight: { sta: Date | null; std: Date | null }): string {
  return toLocalDate((flight.sta ?? flight.std)!);
}

/** Creates the flight together with its task (CLAUDE.md: created automatically). */
export async function createFlight(_previous: FlightFormState, formData: FormData): Promise<FlightFormState> {
  if (!(await isAllowed())) return { message: messages.errors.forbidden };
  const result = await parse(formData);
  if (!result.data) return result.state;

  const flight = await prisma.flight.create({
    data: { ...result.data, tasks: { create: { ...result.task, isPrimary: true } } },
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
      sta: true,
      std: true,
      ata: true,
      atd: true,
      tasks: {
        select: {
          id: true,
          templateId: true,
          isPrimary: true,
          records: { select: { milestoneDefinition: { select: { part: true } } } },
        },
      },
    },
  });
  if (!existing) return { message: messages.errors.notFound };

  const result = await parse(formData);
  if (!result.data) return result.state;

  // The form sets the template of the primary task (the only one until the
  // task types of the 5. mérföldkő reach the form).
  const primary = existing.tasks.find((task) => task.isPrimary) ?? existing.tasks[0];
  // Decision 6 (CLAUDE.md): records point at the template's milestones.
  if (primary && primary.records.length > 0 && result.task.templateId !== primary.templateId) {
    return { errors: { templateId: e.templateLocked }, values: result.values };
  }
  const records = existing.tasks.flatMap((task) => task.records);

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
    const updated = await tx.flight.update({
      where: { id: flightId },
      data: {
        ...result.data,
        ...(dropsArrival ? DROPPED_ARRIVAL : {}),
        ...(dropsDeparture ? DROPPED_DEPARTURE : {}),
      },
    });
    if (primary && primary.templateId !== result.task.templateId) {
      await tx.task.update({ where: { id: primary.id }, data: result.task });
    }
    // A dropped part takes its agent with it (a one-sided task has one agent).
    if (dropsArrival || dropsDeparture) {
      await tx.task.updateMany({
        where: { flightId },
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

/**
 * "Késés rögzítése": a new estimated arrival and/or departure on the same
 * flight, with its source. The latest value always counts; the log keeps them all.
 */
export async function recordDelay(
  flightId: string,
  _previous: DelayFormState,
  formData: FormData,
): Promise<DelayFormState> {
  const actor = await getCurrentUser();
  if (!actor || !canManageFlights(actor)) return { message: messages.errors.forbidden };
  const flight = await prisma.flight.findUnique({
    where: { id: flightId },
    select: { sta: true, std: true, arrivalCancelled: true, departureCancelled: true },
  });
  if (!flight) return { message: messages.errors.notFound };

  const values = formValues(formData, DELAY_FIELDS);
  const parsed = delaySchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const partErrors = delayPartErrors(parsed.data, flight);
  if (Object.keys(partErrors).length > 0) return { errors: partErrors, values };

  const { eta, etd } = parsed.data;
  const note = parsed.data.note || null;
  const now = new Date();
  await prisma.$transaction([
    prisma.flight.update({
      where: { id: flightId },
      data: {
        ...(eta ? { eta, etaSource: "MANUAL", etaNote: note, etaRecordedById: actor.id, etaRecordedAt: now } : {}),
        ...(etd ? { etd, etdSource: "MANUAL", etdNote: note, etdRecordedById: actor.id, etdRecordedAt: now } : {}),
      },
    }),
    prisma.flightEvent.create({
      data: { flightId, kind: "DELAY", eta, etd, source: "MANUAL", note, createdById: actor.id, createdAt: now },
    }),
  ]);
  refresh();
  return { notice: messages.delay.saved };
}

function isPart(value: unknown): value is Part {
  return value === "ARRIVAL_PART" || value === "DEPARTURE_PART";
}

/**
 * Cancels or restores one part of a flight ("Késés és törlés"). The flight is
 * never deleted, the assignment stays, and both directions are logged.
 */
export async function setPartCancelled(flightId: string, part: Part, cancelled: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actionUser(canManageFlights);
    if (!isPart(part) || typeof cancelled !== "boolean") throw new ActionError(messages.errors.invalidInput);
    const flight = await prisma.flight.findUnique({
      where: { id: flightId },
      select: { sta: true, std: true, arrivalCancelled: true, departureCancelled: true },
    });
    if (!flight) throw new ActionError(messages.errors.notFound);

    const arrival = part === "ARRIVAL_PART";
    if (!(arrival ? flight.sta : flight.std)) throw new ActionError(messages.assignment.missingPart);
    if ((arrival ? flight.arrivalCancelled : flight.departureCancelled) === cancelled) return;

    const now = new Date();
    const by = cancelled ? actor.id : null;
    const at = cancelled ? now : null;
    await prisma.$transaction([
      prisma.flight.update({
        where: { id: flightId },
        data: arrival
          ? { arrivalCancelled: cancelled, arrivalCancelledById: by, arrivalCancelledAt: at }
          : { departureCancelled: cancelled, departureCancelledById: by, departureCancelledAt: at },
      }),
      prisma.flightEvent.create({
        data: { flightId, kind: cancelled ? "CANCEL" : "RESTORE", part, createdById: actor.id, createdAt: now },
      }),
    ]);
    refresh();
  });
}
