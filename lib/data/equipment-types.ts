import { swapWithNeighbour } from "@/lib/data/order";
import { prisma } from "@/lib/db";

// Equipment types and their field lists (CLAUDE.md, 11. mérföldkő,
// "Eszközök"). A field is never deleted, only made inactive; its kind is fixed
// once a piece of equipment has a value for it.

export async function listEquipmentTypes() {
  return prisma.equipmentType.findMany({
    include: { _count: { select: { fields: true, equipment: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
}

export async function getEquipmentType(id: string) {
  return prisma.equipmentType.findUnique({
    where: { id },
    include: { fields: { orderBy: { order: "asc" }, include: { _count: { select: { values: true } } } } },
  });
}

export async function addField(typeId: string, data: { name: string; kind: "DEADLINE" | "COUNTER" | "TEXT"; unit: string | null; active: boolean }) {
  await prisma.$transaction(async (tx) => {
    const last = await tx.equipmentField.aggregate({ where: { typeId }, _max: { order: true } });
    await tx.equipmentField.create({ data: { ...data, typeId, order: (last._max.order ?? 0) + 1 } });
  });
}

export type FieldProblem = "notFound" | "kindLocked";

/** Updates a field; its kind stays once it has a value. */
export async function updateField(
  id: string,
  data: { name: string; kind: "DEADLINE" | "COUNTER" | "TEXT"; unit: string | null; active: boolean },
): Promise<FieldProblem | null> {
  const field = await prisma.equipmentField.findUnique({ where: { id }, select: { kind: true, _count: { select: { values: true } } } });
  if (!field) return "notFound";
  if (field.kind !== data.kind && field._count.values > 0) return "kindLocked";
  await prisma.equipmentField.update({ where: { id }, data });
  return null;
}

export async function moveField(id: string, direction: -1 | 1): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const field = await tx.equipmentField.findUnique({ where: { id }, select: { typeId: true } });
    if (!field) return false;
    const items = await tx.equipmentField.findMany({ where: { typeId: field.typeId }, select: { id: true, order: true } });
    return swapWithNeighbour(items, id, direction, (itemId, order) => tx.equipmentField.update({ where: { id: itemId }, data: { order } }));
  });
}
