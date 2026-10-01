import { changeEquipmentStatus, saveEquipmentDocument, saveValue } from "@/lib/data/equipment";
import { addField } from "@/lib/data/equipment-types";
import { addFaultComment, closeFault, reportFault, takeFault } from "@/lib/data/faults";
import { prisma } from "@/lib/db";
import { SEED_EQUIPMENT, SEED_EQUIPMENT_TYPES, SEED_FAULTS, SEED_TECHNICIAN, seedFieldValue } from "./seed-equipment";
import { textPdf } from "./seed-pdf";

// Writes the ground equipment demo data (CLAUDE.md, 11. mérföldkő, 8. lépés)
// through the same data functions the pages use, then moves the faults back
// in time as if they had happened then.

const HOUR_MS = 3600_000;

async function userId(username: string): Promise<string> {
  return (await prisma.user.findUniqueOrThrow({ where: { username }, select: { id: true } })).id;
}

/** Moves a fault and everything logged with it to the given hours before now. */
async function backdate(faultId: string, fault: (typeof SEED_FAULTS)[number], now: number) {
  const at = (hoursAgo: number) => new Date(now - hoursAgo * HOUR_MS);
  await prisma.fault.update({
    where: { id: faultId },
    data: {
      reportedAt: at(fault.reportedHoursAgo),
      ...(fault.taken ? { takenAt: at(fault.taken.hoursAgo) } : {}),
      ...(fault.closed ? { closedAt: at(fault.closed.hoursAgo) } : {}),
    },
  });
  const steps = [
    ["OPEN", fault.reportedHoursAgo],
    ["IN_PROGRESS", fault.taken?.hoursAgo],
    ["CLOSED", fault.closed?.hoursAgo],
  ] as const;
  for (const [toStatus, hoursAgo] of steps) {
    if (hoursAgo !== undefined) await prisma.faultEvent.updateMany({ where: { faultId, toStatus }, data: { createdAt: at(hoursAgo) } });
  }
  // The equipment went out of service at the report and back at the closing.
  await prisma.equipmentEvent.updateMany({ where: { faultId, toStatus: "OUT_OF_SERVICE" }, data: { createdAt: at(fault.reportedHoursAgo) } });
  if (fault.closed) await prisma.equipmentEvent.updateMany({ where: { faultId, toStatus: "OPERATIONAL" }, data: { createdAt: at(fault.closed.hoursAgo) } });
  const comments = await prisma.faultComment.findMany({ where: { faultId }, orderBy: { createdAt: "asc" }, select: { id: true } });
  for (const [index, comment] of comments.entries()) {
    await prisma.faultComment.update({ where: { id: comment.id }, data: { createdAt: at(fault.comments![index].hoursAgo) } });
  }
}

export async function seedEquipment(localDate: string): Promise<void> {
  const technician = await userId(SEED_TECHNICIAN);

  const fields = new Map<string, Map<string, { id: string; kind: "DEADLINE" | "COUNTER" | "TEXT" }>>();
  for (const type of SEED_EQUIPMENT_TYPES) {
    const created = await prisma.equipmentType.create({ data: { name: type.name, code: type.code } });
    for (const field of type.fields) await addField(created.id, { name: field.name, kind: field.kind, unit: field.unit ?? null, active: true });
    const rows = await prisma.equipmentField.findMany({ where: { typeId: created.id }, select: { id: true, name: true, kind: true } });
    fields.set(type.code, new Map(rows.map((row) => [row.name, { id: row.id, kind: row.kind }])));
  }

  const equipmentIds = new Map<string, string>();
  for (const item of SEED_EQUIPMENT) {
    const type = await prisma.equipmentType.findUniqueOrThrow({ where: { code: item.type }, select: { id: true } });
    const created = await prisma.equipment.create({
      data: { typeId: type.id, identifier: item.identifier, plate: item.plate ?? null, description: item.description ?? null },
    });
    equipmentIds.set(item.identifier, created.id);
    const typeFields = fields.get(item.type)!;
    if (item.earlier) {
      const field = typeFields.get(item.earlier.field)!;
      await saveValue(created.id, field.id, { kind: "COUNTER", value: item.earlier.value, due: item.earlier.due }, technician);
    }
    for (const [name, field] of typeFields) {
      if (!(name in item.values)) continue;
      await saveValue(created.id, field.id, seedFieldValue(field.kind, item.values[name], localDate), technician);
    }
    if (item.document) {
      const bytes = textPdf(item.document.lines);
      const file = new File([new Uint8Array(bytes)], item.document.fileName, { type: "application/pdf" });
      const saved = await saveEquipmentDocument(created.id, file, technician);
      if (!saved.ok) throw new Error(`Seed equipment document: ${saved.problem}`);
    }
    if (item.retired) await changeEquipmentStatus(created.id, "RETIRED", technician, item.retired);
  }

  const now = Date.now();
  for (const fault of SEED_FAULTS) {
    const reported = await reportFault(
      { equipmentId: equipmentIds.get(fault.equipment)!, description: fault.description, outOfService: fault.outOfService },
      [],
      await userId(fault.reportedBy),
    );
    if (!("id" in reported)) throw new Error(`Seed fault: ${reported.problem}`);
    if (fault.taken) await takeFault(reported.id, technician);
    for (const comment of fault.comments ?? []) await addFaultComment(reported.id, technician, comment.text);
    if (fault.closed) await closeFault(reported.id, technician, fault.closed.resolution, fault.closed.restore);
    await backdate(reported.id, fault, now);
  }
}
