"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { actionUser, runAction, type ActionResult } from "@/lib/action";
import { addField, moveField, updateField } from "@/lib/data/equipment-types";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { canManageEquipment } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { FIELD_FIELDS, fieldSchema, TYPE_FIELDS, typeSchema, type FieldFormInput, type TypeFormInput } from "@/lib/validation/equipment";
import { fieldErrors, formValues, type FormState } from "@/lib/validation/form";

// Equipment types and their fields (CLAUDE.md, 11. mérföldkő): with "Eszközök kezelése".

const t = messages.equipmentTypes;

export type TypeFormState = FormState<TypeFormInput>;
export type FieldFormState = FormState<FieldFormInput>;

async function manager() {
  const actor = await getCurrentUser();
  return actor && canManageEquipment(actor) ? actor : null;
}

/** Which unique field a P2002 error is about. */
function taken(error: unknown, fields: readonly string[]): string | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return null;
  const meta = JSON.stringify(error.meta ?? {});
  return fields.find((field) => meta.includes(field)) ?? fields[0];
}

export async function saveTypeAction(id: string | null, _previous: TypeFormState, formData: FormData): Promise<TypeFormState> {
  if (!(await manager())) return { message: messages.errors.forbidden };
  const values = formValues(formData, TYPE_FIELDS);
  const parsed = typeSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  let savedId: string;
  try {
    savedId = id
      ? (await prisma.equipmentType.update({ where: { id }, data: parsed.data })).id
      : (await prisma.equipmentType.create({ data: parsed.data })).id;
  } catch (error) {
    const field = taken(error, ["code", "name"]);
    if (field) return { errors: { [field]: field === "code" ? t.errors.codeTaken : t.errors.nameTaken }, values };
    throw error;
  }
  refresh();
  if (!id) redirect(`/equipment/types/${savedId}?created=1`);
  return { notice: t.saved };
}

export async function addFieldAction(typeId: string, _previous: FieldFormState, formData: FormData): Promise<FieldFormState> {
  if (!(await manager())) return { message: messages.errors.forbidden };
  const values = formValues(formData, FIELD_FIELDS);
  const parsed = fieldSchema.safeParse({ ...values, active: "on" });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  try {
    await addField(typeId, parsed.data);
  } catch (error) {
    if (taken(error, ["name"])) return { errors: { name: t.errors.fieldNameTaken }, values };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") return { message: messages.errors.notFound };
    throw error;
  }
  refresh();
  return { notice: t.saved, values: { name: "", kind: values.kind, unit: "", active: "on" } };
}

export async function saveFieldAction(id: string, _previous: FieldFormState, formData: FormData): Promise<FieldFormState> {
  if (!(await manager())) return { message: messages.errors.forbidden };
  const values = formValues(formData, FIELD_FIELDS);
  const parsed = fieldSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  try {
    const problem = await updateField(id, parsed.data);
    if (problem === "notFound") return { message: messages.errors.notFound };
    if (problem === "kindLocked") return { errors: { kind: t.errors.kindLocked }, values };
  } catch (error) {
    if (taken(error, ["name"])) return { errors: { name: t.errors.fieldNameTaken }, values };
    throw error;
  }
  refresh();
  return { notice: t.saved };
}

export async function moveFieldAction(id: string, direction: -1 | 1): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canManageEquipment);
    await moveField(id, direction);
    refresh();
  });
}
