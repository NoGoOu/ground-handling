import { z } from "zod";
import { messages } from "@/lib/messages";
import { DELAY_CODE } from "@/lib/telex/mvt";

// Delay codes and delay records (CLAUDE.md, 7. mérföldkő, "Késéskód").

const e = messages.delayCodes.errors;

export const DELAY_CODE_FIELDS = ["code", "description", "active"] as const;
export type DelayCodeFormInput = Record<(typeof DELAY_CODE_FIELDS)[number], string>;

/** The code as in the MVT's DL line. */
export const DELAY_CODE_PATTERN = DELAY_CODE;

export const delayCodeSchema = z.object({
  code: z.string().trim().toUpperCase().pipe(z.string().regex(DELAY_CODE_PATTERN, e.code)),
  description: z
    .string()
    .trim()
    .max(200, e.description)
    .transform((value) => value || null),
  active: z.string().transform((value) => value === "on"),
});

export const DELAY_RECORD_FIELDS = ["code", "minutes"] as const;
export type DelayRecordFormInput = Record<(typeof DELAY_RECORD_FIELDS)[number], string>;

export const delayRecordSchema = z.object({
  code: z.string().trim().toUpperCase().pipe(z.string().regex(DELAY_CODE_PATTERN, e.code)),
  minutes: z
    .string()
    .trim()
    .regex(/^\d{1,5}$/, e.minutes)
    .transform(Number)
    .pipe(z.number().int().min(1, e.minutes).max(99_999, e.minutes)),
});
