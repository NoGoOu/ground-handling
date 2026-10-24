import { readRecord, type Direction, type RecordError, type Snapshot, type SnapshotRecord } from "./snapshot";

// Merging the snapshots (CLAUDE.md, "Közbeiktatva: valós járatok az
// Ikarus-mentésből", "Összefésülés"). A flight is in many snapshots in a row;
// per record (direction + AODB id) the last snapshot it was in gives the
// values. An actual time and a registration, once given, stay even when a
// later snapshot has them empty or the flight leaves the window.

export interface IkarusLeg extends SnapshotRecord {
  direction: Direction;
  /** The first and the last snapshot it was in. */
  firstSeen: Date;
  lastSeen: Date;
}

export interface MergeError {
  direction: Direction;
  /** Null when the id itself is unreadable. */
  aodbId: number | null;
  error: RecordError;
  snapshot: Date;
}

export interface MergeResult {
  /** By direction, then scheduled time. */
  legs: IkarusLeg[];
  errors: MergeError[];
  /** Records read, counted once per snapshot. */
  occurrences: number;
}

const legKey = (direction: Direction, aodbId: number) => `${direction}|${aodbId}`;

export function mergeSnapshots(snapshots: readonly Snapshot[]): MergeResult {
  const legs = new Map<string, IkarusLeg>();
  const errors: MergeError[] = [];
  let occurrences = 0;
  const ordered = [...snapshots].sort((a, b) => +a.takenAt - +b.takenAt);

  for (const snapshot of ordered) {
    const lists: [Direction, readonly unknown[]][] = [
      ["ARRIVAL", snapshot.arrivals],
      ["DEPARTURE", snapshot.departures],
    ];
    for (const [direction, records] of lists) {
      for (const raw of records) {
        occurrences++;
        const read = readRecord(raw);
        if (!read.ok) {
          errors.push({ direction, aodbId: read.aodbId, error: read.error, snapshot: snapshot.takenAt });
          continue;
        }
        const { record } = read;
        for (const error of read.errors) errors.push({ direction, aodbId: record.aodbId, error, snapshot: snapshot.takenAt });
        const key = legKey(direction, record.aodbId);
        const earlier = legs.get(key);
        legs.set(key, {
          ...record,
          direction,
          actual: record.actual ?? earlier?.actual ?? null,
          registration: record.registration ?? earlier?.registration ?? null,
          firstSeen: earlier?.firstSeen ?? snapshot.takenAt,
          lastSeen: snapshot.takenAt,
        });
      }
    }
  }

  return {
    legs: [...legs.values()].sort(
      (a, b) => a.direction.localeCompare(b.direction) || +a.scheduled - +b.scheduled || a.aodbId - b.aodbId,
    ),
    errors,
    occurrences,
  };
}

/** How many errors there were of each kind. */
export function errorCounts(errors: readonly MergeError[]): Partial<Record<RecordError, number>> {
  const counts: Partial<Record<RecordError, number>> = {};
  for (const { error } of errors) counts[error] = (counts[error] ?? 0) + 1;
  return counts;
}
