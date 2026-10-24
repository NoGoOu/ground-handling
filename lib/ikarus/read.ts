import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { isDayFolder, snapshotFiles, type SnapshotFile } from "./files";
import { parseSnapshot, type Snapshot, type SnapshotError } from "./snapshot";

// Reading the backup folder from disk, for the scripts (the folder is given on
// the command line and stays outside the repository).

export interface ReadResult {
  snapshots: Snapshot[];
  /** Files that are not a snapshot after all; only the name and the reason. */
  unreadable: { file: SnapshotFile; error: SnapshotError }[];
}

export function readSnapshotDir(dir: string, window?: { start: Date; end: Date }): ReadResult {
  const folders = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && isDayFolder(entry.name))
    .map((entry) => ({ name: entry.name, files: readdirSync(path.join(dir, entry.name)) }));
  const snapshots: Snapshot[] = [];
  const unreadable: ReadResult["unreadable"] = [];
  for (const file of snapshotFiles(folders, window)) {
    const parsed = parseSnapshot(readFileSync(path.join(dir, file.folder, file.file), "utf8"), file.takenAt);
    if (parsed.ok) snapshots.push(parsed.snapshot);
    else unreadable.push({ file, error: parsed.error });
  }
  return { snapshots, unreadable };
}
