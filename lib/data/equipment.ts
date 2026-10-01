import path from "node:path";
import type { Prisma } from "@/generated/prisma/client";
import * as storage from "@/lib/data/storage";
import { prisma } from "@/lib/db";
import { canMoveEquipment, type EquipmentStatus } from "@/lib/equipment/faults";
import { equipmentAlerts, nearestDeadline, type FieldValue } from "@/lib/equipment/status";
import { checkUpload, type UploadProblem } from "@/lib/training";
import type { FieldValueData } from "@/lib/validation/equipment";

// Ground equipment (CLAUDE.md, 11. mérföldkő, "Eszközök"): the register, the
// technical data with the log of every change, the status changes and the
// documents. Equipment is never deleted, only retired.

const FOLDER = "equipment";

const dayText = (date: Date) => date.toISOString().slice(0, 10);

const valueSelect = {
  fieldId: true,
  dateValue: true,
  numberValue: true,
  dueValue: true,
  textValue: true,
  field: { select: { id: true, name: true, kind: true, unit: true, active: true, order: true } },
} satisfies Prisma.EquipmentValueSelect;

type ValueRow = Prisma.EquipmentValueGetPayload<{ select: typeof valueSelect }>;

export function toFieldValue(row: ValueRow): FieldValue {
  return {
    field: row.field,
    dateValue: row.dateValue ? dayText(row.dateValue) : null,
    numberValue: row.numberValue,
    dueValue: row.dueValue,
    textValue: row.textValue,
  };
}

/** The register, with what the list shows: status, open faults, the nearest deadline and the alerts. */
export async function listEquipment(options: { retired: boolean }, today: string, warningDays: number) {
  const rows = await prisma.equipment.findMany({
    where: options.retired ? {} : { status: { not: "RETIRED" } },
    include: {
      type: { select: { name: true, code: true, active: true } },
      values: { select: valueSelect },
      _count: { select: { faults: { where: { status: { not: "CLOSED" } } } } },
    },
    orderBy: [{ type: { name: "asc" } }, { identifier: "asc" }],
  });
  return rows.map((row) => {
    const values = row.values.map(toFieldValue);
    return {
      ...row,
      openFaults: row._count.faults,
      nearest: nearestDeadline(values, today, warningDays),
      alerts: equipmentAlerts(values, today, warningDays),
    };
  });
}

export async function getEquipment(id: string) {
  return prisma.equipment.findUnique({
    where: { id },
    include: {
      type: { include: { fields: { where: { active: true }, orderBy: { order: "asc" } } } },
      values: { select: valueSelect },
      valueLogs: { include: { field: { select: { name: true, kind: true, unit: true } }, changedBy: { select: { name: true } } }, orderBy: { changedAt: "desc" } },
      events: { include: { createdBy: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      documents: { include: { uploadedBy: { select: { name: true } }, removedBy: { select: { name: true } } }, orderBy: { uploadedAt: "asc" } },
    },
  });
}

/** The value kept in the log, in the shape of its kind. */
function logValue(kind: string, value: { dateValue: Date | null; numberValue: number | null; dueValue: number | null; textValue: string | null } | null) {
  if (!value) return null;
  if (kind === "DEADLINE") return { date: value.dateValue ? dayText(value.dateValue) : null };
  if (kind === "COUNTER") return { value: value.numberValue, due: value.dueValue };
  return { text: value.textValue };
}

/**
 * Saves the value of one field and logs the change with the old and the new
 * value; an unchanged value writes nothing. False for an unknown or inactive
 * field, or one of another type.
 */
export async function saveValue(equipmentId: string, fieldId: string, data: FieldValueData, userId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const [equipment, field] = await Promise.all([
      tx.equipment.findUnique({ where: { id: equipmentId }, select: { typeId: true } }),
      tx.equipmentField.findUnique({ where: { id: fieldId }, select: { typeId: true, kind: true, active: true } }),
    ]);
    if (!equipment || !field || !field.active || field.typeId !== equipment.typeId || field.kind !== data.kind) return false;
    const next = {
      dateValue: data.kind === "DEADLINE" && data.date ? new Date(`${data.date}T00:00:00Z`) : null,
      numberValue: data.kind === "COUNTER" ? data.value : null,
      dueValue: data.kind === "COUNTER" ? data.due : null,
      textValue: data.kind === "TEXT" ? data.text : null,
    };
    const old = await tx.equipmentValue.findUnique({ where: { equipmentId_fieldId: { equipmentId, fieldId } } });
    const before = logValue(field.kind, old);
    const after = logValue(field.kind, next);
    if (JSON.stringify(before) === JSON.stringify(after)) return true;
    await tx.equipmentValue.upsert({
      where: { equipmentId_fieldId: { equipmentId, fieldId } },
      create: { equipmentId, fieldId, ...next, updatedById: userId },
      update: { ...next, updatedById: userId },
    });
    await tx.equipmentValueLog.create({
      data: {
        equipmentId,
        fieldId,
        oldValue: (before ?? undefined) as Prisma.InputJsonValue | undefined,
        newValue: after as Prisma.InputJsonValue,
        changedById: userId,
      },
    });
    return true;
  });
}

/** A status change by hand or from a fault, logged; false when the step is not allowed. */
export async function changeEquipmentStatus(
  equipmentId: string,
  to: EquipmentStatus,
  userId: string,
  note: string | null,
  faultId: string | null = null,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const equipment = await tx.equipment.findUnique({ where: { id: equipmentId }, select: { status: true } });
    if (!equipment || !canMoveEquipment(equipment.status, to)) return false;
    const moved = await tx.equipment.updateMany({ where: { id: equipmentId, status: equipment.status }, data: { status: to } });
    if (moved.count === 0) return false;
    await tx.equipmentEvent.create({ data: { equipmentId, fromStatus: equipment.status, toStatus: to, note, faultId, createdById: userId } });
    return true;
  });
}

export async function saveEquipmentDocument(equipmentId: string, file: File, userId: string): Promise<{ ok: true } | { ok: false; problem: UploadProblem }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const checked = checkUpload(bytes);
  if ("problem" in checked) return { ok: false, problem: checked.problem };
  const storageKey = await storage.storeFile(FOLDER, bytes, checked.type);
  await prisma.equipmentDocument.create({
    data: {
      equipmentId,
      fileName: path.basename(file.name || "dokumentum").slice(0, 200),
      mimeType: checked.type,
      size: bytes.byteLength,
      storageKey,
      uploadedById: userId,
    },
  });
  return { ok: true };
}

/** Deletes the file from the disk and logs who and when. */
export async function removeEquipmentDocument(documentId: string, userId: string): Promise<boolean> {
  const document = await prisma.equipmentDocument.findUnique({ where: { id: documentId }, select: { storageKey: true } });
  if (!document?.storageKey) return false;
  await prisma.equipmentDocument.update({ where: { id: documentId }, data: { storageKey: null, removedById: userId, removedAt: new Date() } });
  await storage.deleteStoredFile(FOLDER, document.storageKey);
  return true;
}

export async function readEquipmentDocument(documentId: string) {
  const document = await prisma.equipmentDocument.findUnique({ where: { id: documentId }, select: { fileName: true, mimeType: true, storageKey: true } });
  if (!document?.storageKey) return null;
  const content = await storage.readStoredFile(FOLDER, document.storageKey);
  return content && { fileName: document.fileName, mimeType: document.mimeType, content };
}

/** The active types new equipment can be of. */
export async function listActiveTypes() {
  return prisma.equipmentType.findMany({ where: { active: true }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } });
}
