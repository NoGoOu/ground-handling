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
