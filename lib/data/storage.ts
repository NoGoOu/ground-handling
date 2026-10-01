import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_TYPES, type UploadType } from "@/lib/training";

// Our own file storage (CLAUDE.md, 6. mérföldkő, "Fájlok"): a Docker volume
// in production, with a folder per kind of file. A stored file's name is ours
// (a UUID and an extension), never the one the user gave.

/** The folders of the storage: training attachments, delay code documents, equipment documents and fault photos. */
export type StorageFolder = "training" | "delay-codes" | "equipment" | "faults";

/** The upload directory: UPLOAD_DIR, or "uploads" next to the app. */
export function uploadDir(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}

function filePath(folder: StorageFolder, storageKey: string): string {
  // The key is ours; the check keeps any other value out.
  if (!/^[0-9a-f-]{36}\.(pdf|png|jpg)$/.test(storageKey)) throw new Error("Bad storage key");
  // The files are runtime data on a volume, not part of the build: nothing to trace.
  return path.join(/* turbopackIgnore: true */ uploadDir(), folder, storageKey);
}

/** Writes checked bytes under a new name of ours; returns that name (the storage key). */
export async function storeFile(folder: StorageFolder, bytes: Uint8Array, type: UploadType): Promise<string> {
  const storageKey = `${randomUUID()}.${UPLOAD_TYPES[type].extension}`;
  await mkdir(path.dirname(filePath(folder, storageKey)), { recursive: true });
  await writeFile(filePath(folder, storageKey), bytes);
  return storageKey;
}

/** Deletes a stored file; one already gone is fine. */
export async function deleteStoredFile(folder: StorageFolder, storageKey: string): Promise<void> {
  await unlink(filePath(folder, storageKey)).catch(() => undefined);
}

/** The bytes of a stored file; null when it is gone. */
export async function readStoredFile(folder: StorageFolder, storageKey: string): Promise<Buffer | null> {
  return readFile(filePath(folder, storageKey)).catch(() => null);
}
