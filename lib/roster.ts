import { localDayRange } from "@/lib/time";

// Pure roster helpers (CLAUDE.md, "2. mérföldkő"). No database access, so they
// can be unit tested on their own.

export interface PublishedRange {
  /** Budapest midnight of the first and the last published day. */
  startDate: Date;
  endDate: Date;
}

/** Whether some publication covers that Budapest day; a day is published once. */
export function isPublished(day: string, publications: readonly PublishedRange[]): boolean {
  const midnight = localDayRange(day).start.getTime();
  return publications.some(
    (publication) => publication.startDate.getTime() <= midnight && publication.endDate.getTime() >= midnight,
  );
}

export interface ComparableSegment {
  id: string;
  typeId: string;
  start: Date;
  end: Date;
}

const segmentKey = (segment: ComparableSegment) =>
  `${segment.typeId} ${segment.start.getTime()} ${segment.end.getTime()}`;

/**
 * Which segments the published and the actual layer do not share, so the cell
 * can highlight the differences (CLAUDE.md, "Beosztás felülete"). Segments match
 * by type and times; equal segments pair up one by one.
 */
export function segmentDifferences(
  published: readonly ComparableSegment[],
  actual: readonly ComparableSegment[],
): { publishedOnly: string[]; actualOnly: string[] } {
  const remaining = new Map<string, number>();
  for (const segment of published) {
    const key = segmentKey(segment);
    remaining.set(key, (remaining.get(key) ?? 0) + 1);
  }

  const actualOnly: string[] = [];
  const matched = new Map<string, number>();
  for (const segment of actual) {
    const key = segmentKey(segment);
    const left = remaining.get(key) ?? 0;
    if (left > 0) {
      remaining.set(key, left - 1);
      matched.set(key, (matched.get(key) ?? 0) + 1);
    } else {
      actualOnly.push(segment.id);
    }
  }

  const publishedOnly: string[] = [];
  const used = new Map(matched);
  for (const segment of published) {
    const key = segmentKey(segment);
    const pairs = used.get(key) ?? 0;
    if (pairs > 0) used.set(key, pairs - 1);
    else publishedOnly.push(segment.id);
  }

  return { publishedOnly, actualOnly };
}
