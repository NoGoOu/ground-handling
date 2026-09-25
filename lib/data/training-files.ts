import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { checkUpload, UPLOAD_TYPES, type UploadProblem } from "@/lib/training";

// Files of the training records (CLAUDE.md, 6. mérföldkő, "Fájlok"): kept in
// our own storage, a Docker volume in production. A removed file is deleted
// from the disk; its row stays as the log of who removed it and when.

/** The upload directory: UPLOAD_DIR, or "uploads" next to the app. */
export function uploadDir(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}

function filePath(storageKey: string): string {
  // The key is ours (a UUID and an extension); the check keeps any other value out.
  if (!/^[0-9a-f-]{36}\.(pdf|png|jpg)$/.test(storageKey)) throw new Error("Bad storage key");
  return path.join(uploadDir(), "training", storageKey);
}

export async function saveTrainingFile(
  recordId: string,
  file: File,
  userId: string,
): Promise<{ ok: true } | { ok: false; problem: UploadProblem }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const checked = checkUpload(bytes);
  if ("problem" in checked) return { ok: false, problem: checked.problem };

  const storageKey = `${randomUUID()}.${UPLOAD_TYPES[checked.type].extension}`;
  await mkdir(path.dirname(filePath(storageKey)), { recursive: true });
  await writeFile(filePath(storageKey), bytes);
  await prisma.trainingFile.create({
    data: {
      recordId,
      // The name the user gave, for the download; the stored name is ours.
      fileName: path.basename(file.name || "fajl").slice(0, 200),
      mimeType: checked.type,
      size: bytes.byteLength,
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
  await unlink(filePath(file.storageKey)).catch(() => undefined);
  return true;
}

/** A stored file with the person it belongs to, for the download check. */
export async function readTrainingFile(fileId: string) {
  const file = await prisma.trainingFile.findUnique({
    where: { id: fileId },
    select: { fileName: true, mimeType: true, storageKey: true, record: { select: { userId: true } } },
  });
  if (!file?.storageKey) return null;
  const content = await readFile(filePath(file.storageKey)).catch(() => null);
  return content && { fileName: file.fileName, mimeType: file.mimeType, userId: file.record.userId, content };
}
