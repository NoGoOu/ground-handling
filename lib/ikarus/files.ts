// The files of the backup (CLAUDE.md, "A mentés formátuma"): day folders
// "YYYY-MM-DD", in them one file every half hour, "aodb_YYYYMMDD_hhmmZ.json"
// (UTC). There are gaps (machine off, network error, a missing day); anything
// else in the folder is left alone. Pure: the listing comes from ./read.ts.

const DAY_FOLDER = /^\d{4}-\d{2}-\d{2}$/;
const SNAPSHOT_FILE = /^aodb_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})Z\.json$/;

export interface SnapshotFile {
  folder: string;
  file: string;
  takenAt: Date;
}

/** When a snapshot was taken, from its file name; null when the name is not one. */
export function snapshotTime(file: string): Date | null {
  const match = file.match(SNAPSHOT_FILE);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  if (hour > 23 || minute > 59) return null;
  const instant = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return instant.getUTCDate() === day && instant.getUTCMonth() === month - 1 ? instant : null;
}

export const isDayFolder = (name: string) => DAY_FOLDER.test(name);

/**
 * The snapshot files of the day folders, by the time they were taken; only
 * those taken in the window, when one is given (start ≤ t < end). The file
 * name gives the time, so a file in the wrong folder still counts. Files with
 * another name are ignored, and so is a second file of the same minute.
 */
export function snapshotFiles(
  folders: readonly { name: string; files: readonly string[] }[],
  window?: { start: Date; end: Date },
): SnapshotFile[] {
  const byTime = new Map<number, SnapshotFile>();
  for (const folder of folders) {
    if (!isDayFolder(folder.name)) continue;
    for (const file of folder.files) {
      const takenAt = snapshotTime(file);
      if (!takenAt || (window && (takenAt < window.start || takenAt >= window.end))) continue;
      if (!byTime.has(takenAt.getTime())) byTime.set(takenAt.getTime(), { folder: folder.name, file, takenAt });
    }
  }
  return [...byTime.values()].sort((a, b) => +a.takenAt - +b.takenAt);
}
