import * as storage from "@/lib/data/storage";
import { prisma } from "@/lib/db";
import { prepareUpload } from "@/lib/data/uploads";
import type { UploadProblem, UploadType } from "@/lib/training";

// Files of the training records (CLAUDE.md, 6. mérföldkő, "Fájlok"): kept in
// our own storage, a Docker volume in production. A removed file is deleted
// from the disk; its row stays as the log of who removed it and when.

const FOLDER = "training";

/** Writes checked bytes under a new name of ours; returns that name (the storage key). */
export async function storeFile(bytes: Uint8Array, type: UploadType): Promise<string> {
  return storage.storeFile(FOLDER, bytes, type);
}

/** Deletes a stored file; one already gone is fine. */
export async function deleteStoredFile(storageKey: string): Promise<void> {
  return storage.deleteStoredFile(FOLDER, storageKey);
}

export async function saveTrainingFile(
  recordId: string,
  file: File,
  userId: string,
): Promise<{ ok: true } | { ok: false; problem: UploadProblem }> {
  // Checked, and an image shrunk without its metadata (13. mérföldkő, utómunka).
  const prepared = await prepareUpload(file, "fajl");
  if ("problem" in prepared) return { ok: false, problem: prepared.problem };

  const storageKey = await storeFile(prepared.bytes, prepared.type);
  await prisma.trainingFile.create({
    data: {
      recordId,
      // The name the user gave, for the download; the stored name is ours.
      fileName: prepared.name,
      mimeType: prepared.type,
      size: prepared.bytes.byteLength,
      storageKey,
      uploadedById: userId,
    },
  });
  return { ok: true };
}

/** Deletes the file from the disk and logs who and when. */
export async function removeTrainingFile(fileId: string, userId: string): Promise<boolean> {
  const file = await prisma.trainingFile.findUnique({ where: { id: fileId }, select: { storageKey: true } });
  if (!file?.storageKey) return false;
  await prisma.trainingFile.update({
    where: { id: fileId },
    data: { storageKey: null, removedById: userId, removedAt: new Date() },
  });
  await deleteStoredFile(file.storageKey);
  return true;
}

/** A stored file with the person it belongs to, for the download check. */
export async function readTrainingFile(fileId: string) {
  const file = await prisma.trainingFile.findUnique({
    where: { id: fileId },
    select: { fileName: true, mimeType: true, storageKey: true, record: { select: { userId: true } } },
  });
  if (!file?.storageKey) return null;
  const content = await storage.readStoredFile(FOLDER, file.storageKey);
  return content && { fileName: file.fileName, mimeType: file.mimeType, userId: file.record.userId, content };
}
