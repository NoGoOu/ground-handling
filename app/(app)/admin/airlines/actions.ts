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
import { airlineTaskTypesError, airlineTaskTypesFrom, requirementsFrom } from "@/lib/validation/task-type";

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
 * An airline's task types (CLAUDE.md, 5. mérföldkő): per task type a
 * template, active, and one primary. A task type without a template is not
 * used. The change only reaches new flights.
 */
export async function saveAirlineTaskTypes(
  airlineId: string,
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canManageAirlines);
    const airline = await prisma.airline.findUnique({ where: { id: airlineId }, select: { id: true } });
    if (!airline) throw new ActionError(messages.errors.notFound);
    const taskTypes = await prisma.taskType.findMany({ select: { id: true } });
    const { rows, primaryId } = airlineTaskTypesFrom(
      formData,
      taskTypes.map((type) => type.id),
    );
    const error = airlineTaskTypesError(rows, primaryId);
    if (error) throw new ActionError(error);

    // Every chosen template has to be this airline's, for that task type.
    const chosen = rows.filter((row) => row.templateId);
    const templates = await prisma.turnaroundTemplate.findMany({
      where: { id: { in: chosen.map((row) => row.templateId!) }, airlineId },
      select: { id: true, taskTypeId: true },
    });
    const taskTypeOf = new Map(templates.map((template) => [template.id, template.taskTypeId]));
    if (chosen.some((row) => taskTypeOf.get(row.templateId!) !== row.taskTypeId)) {
      throw new ActionError(messages.taskTypes.errors.templateNotOwn);
    }

    // The requirements of each part (6. mérföldkő): active qualifications only;
    // a requirement of an inactive one is left as it is (approved decision 1).
    const requirements = requirementsFrom(
      formData,
      taskTypes.map((type) => type.id),
    );
    const activeQualifications = new Set(
      (await prisma.qualification.findMany({ where: { active: true }, select: { id: true } })).map((q) => q.id),
    );
    for (const parts of requirements.values()) {
      if (Object.values(parts).flat().some((id) => !activeQualifications.has(id))) {
        throw new ActionError(messages.taskTypes.errors.requirement);
      }
    }

    await prisma.$transaction(async (tx) => {
      // The primary flag is unique per airline: clear it before setting it again.
      await tx.airlineTaskType.updateMany({ where: { airlineId }, data: { isPrimary: false } });
      await tx.airlineTaskType.deleteMany({
        where: { airlineId, taskTypeId: { notIn: chosen.map((row) => row.taskTypeId) } },
      });
      for (const row of chosen) {
        const data = { templateId: row.templateId!, active: row.active, isPrimary: row.taskTypeId === primaryId };
        const { id: airlineTaskTypeId } = await tx.airlineTaskType.upsert({
          where: { airlineId_taskTypeId: { airlineId, taskTypeId: row.taskTypeId } },
          create: { airlineId, taskTypeId: row.taskTypeId, ...data },
          update: data,
          select: { id: true },
        });
        const parts = requirements.get(row.taskTypeId)!;
        await tx.taskRequirement.deleteMany({
          where: { airlineTaskTypeId, qualification: { active: true } },
        });
        await tx.taskRequirement.createMany({
          data: (["ARRIVAL_PART", "DEPARTURE_PART"] as const).flatMap((part) =>
            parts[part].map((qualificationId) => ({ airlineTaskTypeId, part, qualificationId })),
          ),
          skipDuplicates: true,
        });
      }
    });
    refresh();
  });
}
