import { addDays, localToUtc, parseLocalDate } from "@/lib/time";
import type { SeedUsername } from "./seed-data";

// Roster demo data (CLAUDE.md, 2. mérföldkő, 3. lépés): a published and an
// actual layer, a training segment with travel time, and a day where the actual
// roster differs from the published one.

export const SEED_SEGMENT_TYPES = [
  { name: "Műszak", code: "SHIFT", operative: true },
  { name: "Oktatás", code: "TRN", operative: false },
] as const;

export interface SeedSegment {
  typeCode: string;
  from: string;
  to: string;
  /** Day offset from the roster's first day. */
  day?: number;
  location?: string;
  description?: string;
  createBlock?: boolean;
  travelBeforeMinutes?: number;
  travelAfterMinutes?: number;
}

export interface SeedShift {
  agent: SeedUsername;
  /** PUBLISHED and ACTUAL shifts are seeded separately. */
  layers: ("PUBLISHED" | "ACTUAL")[];
  note?: string;
  segments: SeedSegment[];
}

/**
 * Day 0 is the run day: published and actual match. Day 1 differs: the actual
 * shift of the second agent starts later than published.
 */
export const SEED_SHIFTS: SeedShift[] = [
  {
    agent: "ugynok1",
    layers: ["PUBLISHED", "ACTUAL"],
    note: "Reggeles",
    segments: [{ typeCode: "SHIFT", from: "06:00", to: "14:00" }],
  },
  {
    agent: "ugynok2",
    layers: ["PUBLISHED", "ACTUAL"],
    segments: [
      {
        typeCode: "TRN",
        from: "09:00",
        to: "10:30",
        location: "Oktatóterem",
        description: "Veszélyes áru ismétlő",
        createBlock: true,
        travelBeforeMinutes: 20,
        travelAfterMinutes: 20,
      },
      { typeCode: "SHIFT", from: "11:00", to: "19:00" },
    ],
  },
  {
    agent: "ugynok1",
    layers: ["PUBLISHED", "ACTUAL"],
    segments: [{ typeCode: "SHIFT", from: "06:00", to: "14:00", day: 1 }],
  },
  // The next day's actual roster differs from what was published.
  {
    agent: "ugynok2",
    layers: ["PUBLISHED"],
    segments: [{ typeCode: "SHIFT", from: "14:00", to: "22:00", day: 1 }],
  },
  {
    agent: "ugynok2",
    layers: ["ACTUAL"],
    note: "Csere: később kezd",
    segments: [{ typeCode: "SHIFT", from: "16:00", to: "22:00", day: 1 }],
  },
];

/** The published period covers both seeded days. */
export const SEED_PUBLICATION_DAYS = 2;

export function segmentTimes(firstDay: string, segment: SeedSegment): { start: Date; end: Date } {
  const localDate = segment.day ? addDays(firstDay, segment.day) : firstDay;
  const day = parseLocalDate(localDate);
  if (!day) throw new Error(`Invalid seed date: ${localDate}`);
  const at = (hhmm: string) => {
    const [hour, minute] = hhmm.split(":").map(Number);
    return localToUtc(day.year, day.month, day.day, hour, minute);
  };
  return { start: at(segment.from), end: at(segment.to) };
}
