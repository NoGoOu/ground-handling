"use server";

import { refresh } from "next/cache";
import { listShiftSegmentTypes } from "@/lib/data/planning";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { canPlan } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { SETTINGS_ID } from "@/lib/settings";
import { fieldErrors, formValues, type FormState } from "@/lib/validation/form";
import {
  PLANNING_SETTINGS_FIELDS,
  planningSettingsSchema,
  type PlanningSettingsFormInput,
} from "@/lib/validation/planning";

export type PlanningSettingsFormState = FormState<PlanningSettingsFormInput>;

export async function updatePlanningSettings(
  _previous: PlanningSettingsFormState,
  formData: FormData,
): Promise<PlanningSettingsFormState> {
  const actor = await getCurrentUser();
  if (!actor || !canPlan(actor)) return { message: messages.errors.forbidden };

  const values = formValues(formData, PLANNING_SETTINGS_FIELDS);
  const parsed = planningSettingsSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  // The saved shift is one operative segment (CLAUDE.md, "Pozíció és műszak").
  const types = await listShiftSegmentTypes();
  if (!types.some((type) => type.id === parsed.data.segmentTypeId)) {
    return { errors: { segmentTypeId: messages.planning.settings.errors.segmentType }, values };
  }

  await prisma.planningSetting.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...parsed.data },
    update: parsed.data,
  });
  refresh();
  return { notice: messages.form.saved };
}
