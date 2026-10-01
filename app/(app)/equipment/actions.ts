"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import { changeEquipmentStatus, removeEquipmentDocument, saveEquipmentDocument, saveValue } from "@/lib/data/equipment";
import { prisma } from "@/lib/db";
import { equipmentStepNeeds, type EquipmentStatus } from "@/lib/equipment/faults";
import { messages } from "@/lib/messages";
import { can, canManageEquipment } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { EQUIPMENT_FIELDS, equipmentSchema, parseValue, VALUE_FIELDS, type EquipmentFormInput, type ValueFormInput } from "@/lib/validation/equipment";
import { fieldErrors, formValues, type FormState } from "@/lib/validation/form";

// Ground equipment (CLAUDE.md, 11. mérföldkő): the register and its technical
// data with "Eszközök kezelése"; setting out of service and back with
// "Hibajegyek kezelése", retiring and bringing back with "Eszközök kezelése".

const e = messages.equipment;

export type EquipmentFormState = FormState<EquipmentFormInput>;
export type ValueFormState = FormState<ValueFormInput>;

async function manager() {
  const actor = await getCurrentUser();
  return actor && canManageEquipment(actor) ? actor : null;
}

export async function saveEquipmentAction(id: string | null, _previous: EquipmentFormState, formData: FormData): Promise<EquipmentFormState> {
  if (!(await manager())) return { message: messages.errors.forbidden };
  const values = formValues(formData, EQUIPMENT_FIELDS);
  const parsed = equipmentSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  // New equipment is of an active type; an existing one keeps its own.
  const type = await prisma.equipmentType.findUnique({ where: { id: parsed.data.typeId }, select: { active: true } });
  const current = id ? await prisma.equipment.findUnique({ where: { id }, select: { typeId: true } }) : null;
  if (!type || (!type.active && current?.typeId !== parsed.data.typeId)) return { errors: { typeId: e.errors.type }, values };
  // Changing the type would leave the values of the old fields behind.
  if (current && current.typeId !== parsed.data.typeId && (await prisma.equipmentValue.count({ where: { equipmentId: id! } })) > 0) {
    return { errors: { typeId: e.errors.type }, values };
  }
  let savedId: string;
  try {
    savedId = id ? (await prisma.equipment.update({ where: { id }, data: parsed.data })).id : (await prisma.equipment.create({ data: parsed.data })).id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { errors: { identifier: e.errors.identifierTaken }, values };
    throw error;
  }
  refresh();
  if (!id) redirect(`/equipment/${savedId}?created=1`);
  return { notice: e.saved };
}

export async function saveValueAction(equipmentId: string, fieldId: string, _previous: ValueFormState, formData: FormData): Promise<ValueFormState> {
  const actor = await manager();
  if (!actor) return { message: messages.errors.forbidden };
  const values = formValues(formData, VALUE_FIELDS);
  const field = await prisma.equipmentField.findUnique({ where: { id: fieldId }, select: { kind: true } });
  if (!field) return { message: e.errors.field };
  const parsed = parseValue(field.kind, values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  if (!(await saveValue(equipmentId, fieldId, parsed.data, actor.id))) return { message: e.errors.field, values };
  refresh();
  return { notice: e.saved };
}

const isStatus = (value: unknown): value is EquipmentStatus => value === "OPERATIONAL" || value === "OUT_OF_SERVICE" || value === "RETIRED";

export async function changeStatusAction(equipmentId: string, to: string, _previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actionUser();
    if (!isStatus(to)) throw new ActionError(messages.errors.invalidInput);
    const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId }, select: { status: true } });
    if (!equipment) throw new ActionError(messages.errors.notFound);
    if (!can(actor, equipmentStepNeeds(equipment.status, to))) throw new ActionError(messages.errors.forbidden);
    const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null;
    if (!(await changeEquipmentStatus(equipmentId, to, actor.id, note))) throw new ActionError(e.errors.status);
    refresh();
  });
}

export async function uploadDocumentAction(equipmentId: string, _previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actionUser(canManageEquipment);
    const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId }, select: { id: true } });
    if (!equipment) throw new ActionError(messages.errors.notFound);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new ActionError(e.errors.file.empty);
    const saved = await saveEquipmentDocument(equipmentId, file, actor.id);
    if (!saved.ok) throw new ActionError(e.errors.file[saved.problem]);
    refresh();
  });
}

export async function removeDocumentAction(documentId: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actionUser(canManageEquipment);
    if (!(await removeEquipmentDocument(documentId, actor.id))) throw new ActionError(messages.errors.notFound);
    refresh();
  });
}
