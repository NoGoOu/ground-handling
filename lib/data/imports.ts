import { prisma } from "@/lib/db";

// Uploaded schedule files live in the database between the steps of the
// import (sheet, header, mapping, dry run, save), for a day at most.

const UPLOAD_LIFETIME_MS = 24 * 60 * 60 * 1000;

/** An upload is only visible to the user who uploaded it. */
export async function findUpload(id: string, userId: string) {
  return prisma.importUpload.findFirst({ where: { id, createdById: userId } });
}

export async function saveUpload(userId: string, fileName: string, content: Uint8Array<ArrayBuffer>) {
  // Housekeeping: nobody finishes an import a day later.
  await prisma.importUpload.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - UPLOAD_LIFETIME_MS) } } });
  return prisma.importUpload.create({
    data: { fileName, size: content.byteLength, content, createdById: userId },
    select: { id: true },
  });
}
