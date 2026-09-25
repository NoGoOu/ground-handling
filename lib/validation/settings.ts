import { z } from "zod";
import { messages } from "@/lib/messages";

const e = messages.settingsForm.errors;

export const SETTINGS_FIELDS = ["deviationGreenMaxMinutes", "deviationYellowMaxMinutes"] as const;
export type SettingsFormInput = Record<(typeof SETTINGS_FIELDS)[number], string>;

/** A whole number typed into a form field (an empty field is an error, not 0). */
function intField(min: number, max: number, message: string) {
  return z
    .string()
    .trim()
    .regex(/^-?\d+$/, message)
    .transform(Number)
    .pipe(z.number().min(min, message).max(max, message));
}

export const settingsSchema = z
  .object({
    deviationGreenMaxMinutes: intField(0, 1440, e.minutes),
    deviationYellowMaxMinutes: intField(0, 1440, e.minutes),
  })
  .refine((s) => s.deviationGreenMaxMinutes <= s.deviationYellowMaxMinutes, {
    path: ["deviationYellowMaxMinutes"],
    message: e.order,
  });

export type SettingsData = z.output<typeof settingsSchema>;

/** "Hamarosan lejár" (6. mérföldkő): a form of its own on the settings page. */
export const EXPIRY_SETTINGS_FIELDS = ["expiryWarningDays"] as const;
export type ExpirySettingsFormInput = Record<(typeof EXPIRY_SETTINGS_FIELDS)[number], string>;

export const expirySettingsSchema = z.object({ expiryWarningDays: intField(0, 365, e.days) });
