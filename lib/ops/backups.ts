import { readdir, stat } from "node:fs/promises";
import path from "node:path";

// The latest backup on the admin page (CLAUDE.md, 13. mérföldkő, "Mentés"):
// the app sees the backup directory read-only and only looks at the finished
// packages; a backup still in the making has another name.

/** Older than this, the admin page warns (placeholder). */
export const BACKUP_WARNING_DAYS = 2;

const PACKAGE_RE = /^backup-\d{8}-\d{6}\.tar\.gz$/;

export type BackupState =
  | { kind: "unconfigured" }
  | { kind: "none" }
  | { kind: "ok" | "old"; name: string; at: Date; bytes: number };

/** How the latest backup stands: none at all, fresh, or older than the warning limit. */
export function backupState(latest: { name: string; at: Date; bytes: number } | null, now: Date, warningDays = BACKUP_WARNING_DAYS): BackupState {
  if (!latest) return { kind: "none" };
  const old = now.getTime() - latest.at.getTime() > warningDays * 86_400_000;
  return { kind: old ? "old" : "ok", ...latest };
}

/** "32 kB", "1.4 MB", "23.5 GB": the size of a backup or a disk. */
export function formatSize(bytes: number): string {
  if (bytes < 1_048_576) return `${Math.max(1, Math.round(bytes / 1024))} kB`;
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
}

/** The finished backups of a directory, the newest first by the time they were completed. */
export async function listBackups(dir: string): Promise<{ name: string; at: Date; bytes: number }[] | null> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return null;
  }
  const backups = await Promise.all(
    names
      .filter((name) => PACKAGE_RE.test(name))
      .map(async (name) => {
        const info = await stat(path.join(/* turbopackIgnore: true */ dir, name));
        return { name, at: info.mtime, bytes: info.size };
      }),
  );
  return backups.sort((a, b) => b.at.getTime() - a.at.getTime());
}

/** The state shown to the admin; "unconfigured" outside production (no BACKUP_DIR). */
export async function latestBackupState(now = new Date()): Promise<BackupState> {
  const dir = process.env.BACKUP_DIR;
  if (!dir) return { kind: "unconfigured" };
  const backups = await listBackups(dir);
  if (!backups) return { kind: "unconfigured" };
  return backupState(backups[0] ?? null, now);
}
