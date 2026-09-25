"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
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

/**
 * The template imported flights of this airline get (3. mérföldkő); empty
 * clears it. Since the task types (5. mérföldkő) this is the template of the
 * airline's primary task type.
 */
export async function setDefaultTemplate(
  airlineId: string,
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canManageAirlines);
    const templateId = String(formData.get("defaultTemplateId") ?? "");
    if (templateId) {
      const template = await prisma.turnaroundTemplate.findFirst({
        where: { id: templateId, airlineId },
        select: { id: true },
      });
      if (!template) throw new ActionError(messages.airlineForm.errors.templateNotOwn);
    }
    const airline = await prisma.airline.findUnique({ where: { id: airlineId }, select: { id: true } });
    if (!airline) throw new ActionError(messages.errors.notFound);
    await prisma.$transaction(async (tx) => {
      if (!templateId) {
        await tx.airlineTaskType.deleteMany({ where: { airlineId, isPrimary: true } });
        return;
      }
      const { taskTypeId } = await tx.turnaroundTemplate.findUniqueOrThrow({
        where: { id: templateId },
        select: { taskTypeId: true },
      });
      await tx.airlineTaskType.updateMany({
        where: { airlineId, isPrimary: true, NOT: { taskTypeId } },
        data: { isPrimary: false },
      });
      await tx.airlineTaskType.upsert({
        where: { airlineId_taskTypeId: { airlineId, taskTypeId } },
        create: { airlineId, taskTypeId, templateId, active: true, isPrimary: true },
        update: { templateId, active: true, isPrimary: true },
      });
    });
    refresh();
  });
}
