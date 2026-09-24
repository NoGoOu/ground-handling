import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { ImportMapping } from "@/lib/import/mapping";
import type { StoredProfile } from "@/lib/import/profiles";
import { readFile, tableFrom } from "@/lib/import/read";
import { mappingSchema } from "@/lib/validation/import";

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

/** Saved profiles with a valid mapping, by name. */
export async function listProfiles(): Promise<StoredProfile[]> {
  const rows = await prisma.importProfile.findMany({
    select: { id: true, name: true, headerFingerprint: true, mapping: true },
    orderBy: { name: "asc" },
  });
  return rows.flatMap((row) => {
    const mapping = mappingSchema.safeParse(row.mapping);
    return mapping.success ? [{ ...row, mapping: mapping.data }] : [];
  });
}

/** Saves under the name: a new profile, or the one with that name updated. */
export async function saveProfile(userId: string, name: string, mapping: ImportMapping, fingerprint: string) {
  const data = { headerFingerprint: fingerprint, mapping: mapping as unknown as Prisma.InputJsonValue };
  return prisma.importProfile.upsert({
    where: { name },
    create: { name, ...data, createdById: userId },
    update: data,
    select: { id: true },
  });
}

/** The table an import works on: the user's upload, its sheet, below its header row. */
export async function loadUploadTable(uploadId: string, userId: string, sheetName: string, headerRow: number) {
  const upload = await findUpload(uploadId, userId);
  if (!upload) return null;
  const parsed = readFile(upload.fileName, upload.content);
  const sheet = parsed.sheets.find((s) => s.name === sheetName);
  if (!sheet) return null;
  return { upload, table: tableFrom(sheet.rows, headerRow - 1) };
}
