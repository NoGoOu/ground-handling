import { z } from "zod";
import { messages } from "@/lib/messages";
import { parseLocalDate } from "@/lib/time";

// Form of the planning settings (CLAUDE.md, 4. mérföldkő, "Tervezési beállítások").

const e = { ...messages.planning.settings.errors, ...messages.planning.create.errors };

export const PLANNING_SETTINGS_FIELDS = [
  "minShiftMinutes",
  "maxShiftMinutes",
  "breakMinutes",
  "breakAfterMinutes",
  "restMinutes",
  "overlapMinutes",
  "extraPositions",
  "segmentTypeId",
] as const;
export type PlanningSettingsFormInput = Record<(typeof PLANNING_SETTINGS_FIELDS)[number], string>;

/** A whole number typed into a form field (an empty field is an error, not 0). */
function intField(min: number, max: number, message: string) {
  return z
    .string()
    .trim()
    .regex(/^-?\d+$/, message)
    .transform(Number)
    .pipe(z.number().min(min, message).max(max, message));
}

const DAY_MINUTES = 1440;

export const planningSettingsSchema = z
  .object({
    minShiftMinutes: intField(0, DAY_MINUTES, e.minutes),
    maxShiftMinutes: intField(1, DAY_MINUTES, e.minutes),
    breakMinutes: intField(0, DAY_MINUTES, e.minutes),
    breakAfterMinutes: intField(0, DAY_MINUTES, e.minutes),
    restMinutes: intField(0, DAY_MINUTES, e.minutes),
    overlapMinutes: intField(0, DAY_MINUTES, e.minutes),
    extraPositions: intField(0, 50, e.extraPositions),
    segmentTypeId: z.string().trim().min(1, e.segmentType),
  })
  .refine((s) => s.maxShiftMinutes >= s.minShiftMinutes, { path: ["maxShiftMinutes"], message: e.shiftOrder })
  .refine((s) => s.restMinutes === 0 || s.overlapMinutes === 0, { path: ["overlapMinutes"], message: e.restOrOverlap });

export type PlanningSettingsData = z.output<typeof planningSettingsSchema>;

/** The longest plan: a month is calculated day by day in one go. */
export const MAX_PLAN_DAYS = 31;

const dayField = z
  .string()
  .trim()
  .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && parseLocalDate(value) !== null, e.day);

export const planPeriodSchema = z
  .object({ start: dayField, end: dayField })
  .refine((p) => p.end >= p.start, { path: ["end"], message: e.periodOrder })
  .refine((p) => daysBetween(p.start, p.end) < MAX_PLAN_DAYS, { path: ["end"], message: e.periodLength });

export type PlanPeriod = z.output<typeof planPeriodSchema>;

function daysBetween(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000);
}
