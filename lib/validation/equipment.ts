import { z } from "zod";
import { messages } from "@/lib/messages";
import { parseLocalDate } from "@/lib/time";

// Forms of ground equipment (CLAUDE.md, 11. mérföldkő): equipment types with
// their field lists, equipment, and the value of one technical data field.

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

const q = messages.equipment.errors;

export const EQUIPMENT_FIELDS = ["typeId", "identifier", "plate", "description", "note"] as const;
export type EquipmentFormInput = Record<(typeof EQUIPMENT_FIELDS)[number], string>;

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => value || null);

export const equipmentSchema = z.object({
  typeId: z.string().trim().min(1, q.type),
  identifier: z
    .string()
    .trim()
    .toUpperCase()
    .pipe(z.string().regex(/^[A-Z0-9][A-Z0-9 ./-]{0,29}$/, q.identifier)),
  plate: z
    .string()
    .trim()
    .toUpperCase()
    .max(20, q.plate)
    .transform((value) => value || null),
  description: optionalText(500, q.description),
  note: optionalText(1000, q.note),
});

/** A number written by hand: a decimal comma is fine; empty is null. */
const optionalNumber = z
  .string()
  .trim()
  .transform((value) => value.replace(",", "."))
  .refine((value) => value === "" || /^\d{1,9}(\.\d{1,2})?$/.test(value), q.number)
  .transform((value) => (value === "" ? null : Number(value)));

/** The value of one field as the form sends it: date, reading and due value, or text. */
export const VALUE_FIELDS = ["date", "value", "due", "text"] as const;
export type ValueFormInput = Record<(typeof VALUE_FIELDS)[number], string>;

export type FieldValueData =
  | { kind: "DEADLINE"; date: string | null }
  | { kind: "COUNTER"; value: number | null; due: number | null }
  | { kind: "TEXT"; text: string | null };

export function parseValue(kind: "DEADLINE" | "COUNTER" | "TEXT", values: ValueFormInput) {
  if (kind === "DEADLINE") {
    return z
      .object({
        date: z
          .string()
          .trim()
          .refine((value) => value === "" || (/^\d{4}-\d{2}-\d{2}$/.test(value) && parseLocalDate(value) !== null), q.date)
          .transform((value) => value || null),
      })
      .transform((v): FieldValueData => ({ kind, date: v.date }))
      .safeParse(values);
  }
  if (kind === "COUNTER") {
    return z
      .object({ value: optionalNumber, due: optionalNumber })
      .transform((v): FieldValueData => ({ kind, value: v.value, due: v.due }))
      .safeParse(values);
  }
  return z
    .object({ text: optionalText(500, q.text) })
    .transform((v): FieldValueData => ({ kind, text: v.text }))
    .safeParse(values);
}

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
