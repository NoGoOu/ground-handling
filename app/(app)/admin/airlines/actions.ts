"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { canManageAirlines } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { AIRLINE_FIELDS, airlineSchema, type AirlineFormInput } from "@/lib/validation/airline";
import { fieldErrors, formValues, type FormState } from "@/lib/validation/form";

export type AirlineFormState = FormState<AirlineFormInput>;

async function save(airlineId: string | null, formData: FormData): Promise<AirlineFormState> {
  const actor = await getCurrentUser();
  if (!actor || !canManageAirlines(actor)) return { message: messages.errors.forbidden };

  const values = formValues(formData, AIRLINE_FIELDS);
  const parsed = airlineSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  try {
    const airline = airlineId
      ? await prisma.airline.update({ where: { id: airlineId }, data: parsed.data })
      : await prisma.airline.create({ data: parsed.data });
    airlineId = airline.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { errors: { iataCode: messages.airlineForm.errors.iataTaken }, values };
    }
    throw error;
  }
  redirect(`/admin/airlines/${airlineId}`);
}

export async function createAirline(_previous: AirlineFormState, formData: FormData): Promise<AirlineFormState> {
  return save(null, formData);
}

export async function updateAirline(
  airlineId: string,
  _previous: AirlineFormState,
  formData: FormData,
): Promise<AirlineFormState> {
  return save(airlineId, formData);
}
