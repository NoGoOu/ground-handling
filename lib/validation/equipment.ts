import { z } from "zod";
import { messages } from "@/lib/messages";

// Forms of ground equipment (CLAUDE.md, 11. mérföldkő): equipment types with
// their field lists.

const t = messages.equipmentTypes.errors;
const checkbox = z.string().transform((value) => value === "on");

export const TYPE_FIELDS = ["name", "code", "active"] as const;
export type TypeFormInput = Record<(typeof TYPE_FIELDS)[number], string>;

export const typeSchema = z.object({
  name: z.string().trim().min(1, t.name).max(80, t.name),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .pipe(z.string().regex(/^[A-Z0-9-]{1,12}$/, t.code)),
  active: checkbox,
});

export const FIELD_FIELDS = ["name", "kind", "unit", "active"] as const;
export type FieldFormInput = Record<(typeof FIELD_FIELDS)[number], string>;

export const fieldSchema = z
  .object({
    name: z.string().trim().min(1, t.fieldName).max(80, t.fieldName),
    kind: z.enum(["DEADLINE", "COUNTER", "TEXT"], { message: t.kind }),
    unit: z.string().trim().max(20, t.unit),
    active: checkbox,
  })
  // Only a counter has a unit.
  .transform((field) => ({ ...field, unit: field.kind === "COUNTER" && field.unit ? field.unit : null }));
