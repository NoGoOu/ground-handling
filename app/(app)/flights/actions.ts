"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { canManageFlights } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { toLocalDate } from "@/lib/time";
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

/** Creates the flight together with its task (CLAUDE.md: one task per flight, created automatically). */
export async function createFlight(_previous: FlightFormState, formData: FormData): Promise<FlightFormState> {
  if (!(await isAllowed())) return { message: messages.errors.forbidden };
  const result = await parse(formData);
  if (!result.data) return result.state;

  const flight = await prisma.flight.create({
    data: { ...result.data, task: { create: {} } },
  });
  redirect(`/flights?date=${toLocalDate(flight.sta)}`);
}

export async function updateFlight(
  flightId: string,
  _previous: FlightFormState,
  formData: FormData,
): Promise<FlightFormState> {
  if (!(await isAllowed())) return { message: messages.errors.forbidden };
  const existing = await prisma.flight.findUnique({
    where: { id: flightId },
    select: { templateId: true, task: { select: { _count: { select: { records: true } } } } },
  });
  if (!existing) return { message: messages.errors.notFound };

  const result = await parse(formData);
  if (!result.data) return result.state;

  // Provisional decision 6: records point at the template's milestones.
  const hasRecords = (existing.task?._count.records ?? 0) > 0;
  if (hasRecords && result.data.templateId !== existing.templateId) {
    return { errors: { templateId: e.templateLocked }, values: result.values };
  }

  const flight = await prisma.flight.update({ where: { id: flightId }, data: result.data });
  redirect(`/flights?date=${toLocalDate(flight.sta)}`);
}
