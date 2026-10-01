import path from "node:path";
import { changeEquipmentStatus } from "@/lib/data/equipment";
import * as storage from "@/lib/data/storage";
import { prisma } from "@/lib/db";
import { canMoveFault, isReportable, statusOnReport } from "@/lib/equipment/faults";
import { checkUpload, type UploadProblem, type UploadType } from "@/lib/training";

// Faults on ground equipment (CLAUDE.md, 11. mérföldkő, "Hibajegy"): anyone
// reports one, from a phone too, with photos; one marked out of service sets
// the equipment out of service at once.

const FOLDER = "faults";

/** At most this many photos to a fault, and this much in all (the request limit of the app). */
export const MAX_FAULT_PHOTOS = 5;
export const MAX_FAULT_PHOTOS_BYTES = 25 * 1024 * 1024;

/** The equipment a fault can be reported on: everything not retired. */
export async function listReportableEquipment() {
  return prisma.equipment.findMany({
    where: { status: { not: "RETIRED" } },
    select: { id: true, identifier: true, status: true, type: { select: { name: true } } },
    orderBy: [{ type: { name: "asc" } }, { identifier: "asc" }],
  });
}

export type ReportProblem = "equipment" | "tooManyPhotos" | "tooLarge" | { photo: UploadProblem };

/** Checks the photos before anything is written: all of them are good, or none is stored. */
async function checkPhotos(files: readonly File[]): Promise<{ bytes: Uint8Array; type: UploadType; name: string }[] | ReportProblem> {
  if (files.length > MAX_FAULT_PHOTOS) return "tooManyPhotos";
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_FAULT_PHOTOS_BYTES) return "tooLarge";
  const checked: { bytes: Uint8Array; type: UploadType; name: string }[] = [];
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = checkUpload(bytes);
    if ("problem" in result) return { photo: result.problem };
    checked.push({ bytes, type: result.type, name: path.basename(file.name || "foto").slice(0, 200) });
  }
  return checked;
}

export async function reportFault(
  data: { equipmentId: string; description: string; outOfService: boolean },
  files: readonly File[],
  userId: string,
): Promise<{ id: string } | { problem: ReportProblem }> {
  const equipment = await prisma.equipment.findUnique({ where: { id: data.equipmentId }, select: { status: true } });
  if (!equipment || !isReportable(equipment.status)) return { problem: "equipment" };
  const photos = await checkPhotos(files);
  if (!Array.isArray(photos)) return { problem: photos };

  const keys = await Promise.all(photos.map((photo) => storage.storeFile(FOLDER, photo.bytes, photo.type)));
  let faultId: string;
  try {
    faultId = await prisma.$transaction(async (tx) => {
      const fault = await tx.fault.create({
        data: { equipmentId: data.equipmentId, description: data.description, reportedOutOfService: data.outOfService, reportedById: userId },
      });
      await tx.faultEvent.create({ data: { faultId: fault.id, fromStatus: null, toStatus: "OPEN", createdById: userId } });
      for (const [index, photo] of photos.entries()) {
        await tx.faultPhoto.create({
          data: { faultId: fault.id, fileName: photo.name, mimeType: photo.type, size: photo.bytes.byteLength, storageKey: keys[index], uploadedById: userId },
        });
      }
      return fault.id;
    });
  } catch (error) {
    for (const key of keys) await storage.deleteStoredFile(FOLDER, key);
    throw error;
  }
  // Marked out of service: the equipment is out of service at once, logged with the fault.
  const next = statusOnReport(equipment.status, data.outOfService);
  if (next) await changeEquipmentStatus(data.equipmentId, next, userId, null, faultId);
  return { id: faultId };
}

const faultInclude = {
  equipment: { select: { id: true, identifier: true, status: true, type: { select: { name: true } } } },
  reportedBy: { select: { id: true, name: true } },
  takenBy: { select: { name: true } },
  closedBy: { select: { name: true } },
  photos: { select: { id: true, fileName: true, mimeType: true }, orderBy: { uploadedAt: "asc" } },
  comments: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
  events: { include: { createdBy: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
} as const;

export async function getFault(id: string) {
  return prisma.fault.findUnique({ where: { id }, include: faultInclude });
}

/** The technical staff take a fault over: open → in progress, logged. */
export async function takeFault(id: string, actorId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const fault = await tx.fault.findUnique({ where: { id }, select: { status: true } });
    if (!fault || !canMoveFault(fault.status, "IN_PROGRESS")) return false;
    const moved = await tx.fault.updateMany({ where: { id, status: fault.status }, data: { status: "IN_PROGRESS", takenById: actorId, takenAt: new Date() } });
    if (moved.count === 0) return false;
    await tx.faultEvent.create({ data: { faultId: id, fromStatus: fault.status, toStatus: "IN_PROGRESS", createdById: actorId } });
    return true;
  });
}

/**
 * Closes a fault, fixed or not a fault, logged. Setting the equipment back to
 * operational is the technical staff's own step: here only when they tick it
 * (approved decision 5).
 */
export async function closeFault(id: string, actorId: string, resolution: "FIXED" | "NOT_A_FAULT", restore: boolean): Promise<boolean> {
  const closed = await prisma.$transaction(async (tx) => {
    const fault = await tx.fault.findUnique({ where: { id }, select: { status: true } });
    if (!fault || !canMoveFault(fault.status, "CLOSED")) return false;
    const moved = await tx.fault.updateMany({
      where: { id, status: fault.status },
      data: { status: "CLOSED", resolution, closedById: actorId, closedAt: new Date() },
    });
    if (moved.count === 0) return false;
    await tx.faultEvent.create({ data: { faultId: id, fromStatus: fault.status, toStatus: "CLOSED", createdById: actorId } });
    return true;
  });
  if (closed && restore) {
    const fault = await prisma.fault.findUniqueOrThrow({ where: { id }, select: { equipmentId: true, equipment: { select: { status: true } } } });
    if (fault.equipment.status === "OUT_OF_SERVICE") await changeEquipmentStatus(fault.equipmentId, "OPERATIONAL", actorId, null, id);
  }
  return closed;
}

export async function addFaultComment(id: string, authorId: string, text: string): Promise<boolean> {
  const fault = await prisma.fault.findUnique({ where: { id }, select: { id: true } });
  if (!fault) return false;
  await prisma.faultComment.create({ data: { faultId: id, authorId, text } });
  return true;
}

/** Faults of the given reporters (everyone's when null), open ones first, newest first. */
export async function listFaults(reporterIds: readonly string[] | null, options: { open: boolean; equipmentId?: string }) {
  return prisma.fault.findMany({
    where: {
      ...(reporterIds ? { reportedById: { in: [...reporterIds] } } : {}),
      ...(options.open ? { status: { not: "CLOSED" } } : {}),
      ...(options.equipmentId ? { equipmentId: options.equipmentId } : {}),
    },
    include: {
      equipment: { select: { id: true, identifier: true, type: { select: { name: true } } } },
      reportedBy: { select: { name: true } },
      takenBy: { select: { name: true } },
      _count: { select: { comments: true, photos: true } },
    },
    orderBy: [{ status: "asc" }, { reportedAt: "desc" }],
    take: 300,
  });
}

/** The open faults, for the count in the menu of the technical staff. */
export async function countOpenFaults(): Promise<number> {
  return prisma.fault.count({ where: { status: { not: "CLOSED" } } });
}

/** A photo with its fault's reporter, for the download check. */
export async function readFaultPhoto(photoId: string) {
  const photo = await prisma.faultPhoto.findUnique({
    where: { id: photoId },
    select: { fileName: true, mimeType: true, storageKey: true, fault: { select: { reportedById: true } } },
  });
  if (!photo) return null;
  const content = await storage.readStoredFile(FOLDER, photo.storageKey);
  return content && { fileName: photo.fileName, mimeType: photo.mimeType, reportedById: photo.fault.reportedById, content };
}
