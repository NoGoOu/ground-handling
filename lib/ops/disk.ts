import { readdir, stat, statfs } from "node:fs/promises";
import path from "node:path";
import { uploadDir } from "@/lib/data/storage";

// Watching the disk (CLAUDE.md, 13. mérföldkő, utómunka, "Lemezfigyelés"):
// how full the disk of the uploaded files and of the backups is, and how
// much the backups take. Over the limit the admin page warns and the health
// endpoint says so, but the app is not taken for sick.

/** Over this share of the disk in use, a warning (placeholder). */
export const DISK_WARNING_PERCENT = 80;

export interface DiskUsage {
  totalBytes: number;
  freeBytes: number;
  usedPercent: number;
  warning: boolean;
}

/** The use of a disk from its size and the space left for the app (like df). */
export function diskUsage(totalBytes: number, freeBytes: number, warningPercent = DISK_WARNING_PERCENT): DiskUsage {
  const usedPercent = totalBytes > 0 ? Math.round(((totalBytes - freeBytes) / totalBytes) * 100) : 0;
  return { totalBytes, freeBytes, usedPercent, warning: usedPercent > warningPercent };
}

async function measure(dir: string): Promise<DiskUsage | null> {
  try {
    const info = await statfs(dir);
    return diskUsage(info.blocks * info.bsize, info.bavail * info.bsize);
  } catch {
    return null;
  }
}

/**
 * The disks to watch: that of the uploaded files and, in production, that of
 * the backups. One disk is shown once, even when both live on it.
 */
export async function watchedDisks(): Promise<{ label: "uploads" | "backups"; usage: DiskUsage }[]> {
  const found: { label: "uploads" | "backups"; usage: DiskUsage }[] = [];
  const uploads = await measure(uploadDir());
  if (uploads) found.push({ label: "uploads", usage: uploads });
  const backupDir = process.env.BACKUP_DIR;
  const backups = backupDir ? await measure(backupDir) : null;
  if (backups && !(uploads && uploads.totalBytes === backups.totalBytes)) found.push({ label: "backups", usage: backups });
  return found;
}

/** The fullest of the watched disks, for the health endpoint; null when none can be read. */
export async function fullestDisk(): Promise<DiskUsage | null> {
  const disks = await watchedDisks();
  return disks.reduce<DiskUsage | null>((top, { usage }) => (!top || usage.usedPercent > top.usedPercent ? usage : top), null);
}

/** The bytes of every file under a directory; 0 when it is missing. */
export async function directorySize(dir: string): Promise<number> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  let total = 0;
  for (const entry of entries) {
    const full = path.join(/* turbopackIgnore: true */ dir, entry.name);
    if (entry.isDirectory()) total += await directorySize(full);
    else if (entry.isFile()) total += (await stat(full)).size;
  }
  return total;
}

/** What the backups take: the daily database packages and the shared file store. */
export async function backupSizes(): Promise<{ packages: number; files: number } | null> {
  const dir = process.env.BACKUP_DIR;
  if (!dir) return null;
  const total = await directorySize(dir);
  const files = await directorySize(path.join(/* turbopackIgnore: true */ dir, "files"));
  return { packages: total - files, files };
}
