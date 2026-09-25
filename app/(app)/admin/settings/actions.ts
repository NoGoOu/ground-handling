"use server";

import { refresh } from "next/cache";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { canManageSettings } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { SETTINGS_ID } from "@/lib/settings";
import { fieldErrors, formValues, type FormState } from "@/lib/validation/form";
import {
  EXPIRY_SETTINGS_FIELDS,
  expirySettingsSchema,
  SETTINGS_FIELDS,
  settingsSchema,
  type ExpirySettingsFormInput,
  type SettingsFormInput,
} from "@/lib/validation/settings";

export type SettingsFormState = FormState<SettingsFormInput>;

export async function updateSettings(
  _previous: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const actor = await getCurrentUser();
  if (!actor || !canManageSettings(actor)) return { message: messages.errors.forbidden };

  const values = formValues(formData, SETTINGS_FIELDS);
  const parsed = settingsSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  await prisma.setting.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...parsed.data },
    update: parsed.data,
  });
  refresh();
  return { notice: messages.form.saved };
}

export type ExpirySettingsFormState = FormState<ExpirySettingsFormInput>;

/** How many days before the end a qualification is "hamarosan lejár" (6. mérföldkő). */
export async function updateExpirySettings(
  _previous: ExpirySettingsFormState,
  formData: FormData,
): Promise<ExpirySettingsFormState> {
  const actor = await getCurrentUser();
  if (!actor || !canManageSettings(actor)) return { message: messages.errors.forbidden };

  const values = formValues(formData, EXPIRY_SETTINGS_FIELDS);
  const parsed = expirySettingsSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  await prisma.setting.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...parsed.data },
    update: parsed.data,
  });
  refresh();
  return { notice: messages.form.saved };
}
