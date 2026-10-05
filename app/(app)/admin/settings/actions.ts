"use server";

import { refresh } from "next/cache";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { canManageSettings } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { SETTINGS_ID } from "@/lib/settings";
import { BUD_STATION_ID } from "@/lib/stations";
import { fieldErrors, formValues, type FormState } from "@/lib/validation/form";
import {
  CALENDAR_SETTINGS_FIELDS,
  calendarSettingsSchema,
  EQUIPMENT_EXPIRY_SETTINGS_FIELDS,
  equipmentExpirySettingsSchema,
  EXPIRY_SETTINGS_FIELDS,
  expirySettingsSchema,
  SETTINGS_FIELDS,
  settingsSchema,
  type CalendarSettingsFormInput,
  type EquipmentExpirySettingsFormInput,
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

  await prisma.stationSetting.upsert({
    where: { stationId: BUD_STATION_ID },
    create: { stationId: BUD_STATION_ID, ...parsed.data },
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

  await prisma.stationSetting.upsert({
    where: { stationId: BUD_STATION_ID },
    create: { stationId: BUD_STATION_ID, ...parsed.data },
    update: parsed.data,
  });
  refresh();
  return { notice: messages.form.saved };
}

export type EquipmentExpirySettingsFormState = FormState<EquipmentExpirySettingsFormInput>;

/** How many days before a deadline of ground equipment it is "hamarosan lejár" (11. mérföldkő). */
export async function updateEquipmentExpirySettings(
  _previous: EquipmentExpirySettingsFormState,
  formData: FormData,
): Promise<EquipmentExpirySettingsFormState> {
  const actor = await getCurrentUser();
  if (!actor || !canManageSettings(actor)) return { message: messages.errors.forbidden };

  const values = formValues(formData, EQUIPMENT_EXPIRY_SETTINGS_FIELDS);
  const parsed = equipmentExpirySettingsSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  await prisma.stationSetting.upsert({
    where: { stationId: BUD_STATION_ID },
    create: { stationId: BUD_STATION_ID, ...parsed.data },
    update: parsed.data,
  });
  refresh();
  return { notice: messages.form.saved };
}

export type CalendarSettingsFormState = FormState<CalendarSettingsFormInput>;

/** The refresh suggested to the calendars subscribed to a roster (12. mérföldkő). */
export async function updateCalendarSettings(
  _previous: CalendarSettingsFormState,
  formData: FormData,
): Promise<CalendarSettingsFormState> {
  const actor = await getCurrentUser();
  if (!actor || !canManageSettings(actor)) return { message: messages.errors.forbidden };

  const values = formValues(formData, CALENDAR_SETTINGS_FIELDS);
  const parsed = calendarSettingsSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  await prisma.setting.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...parsed.data },
    update: parsed.data,
  });
  refresh();
  return { notice: messages.form.saved };
}
