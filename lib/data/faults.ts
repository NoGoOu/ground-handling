import path from "node:path";
import { changeEquipmentStatus } from "@/lib/data/equipment";
import * as storage from "@/lib/data/storage";
import { prisma } from "@/lib/db";
import { isReportable, statusOnReport } from "@/lib/equipment/faults";
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
