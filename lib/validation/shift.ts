import { z } from "zod";
import { messages } from "@/lib/messages";
import { parseLocalDateTime } from "@/lib/time";

const e = messages.shiftForm.errors;

// A shift is made of segments; the segment carries the times (CLAUDE.md,
// "Műszak és műszakrészek").

export const SEGMENT_FIELDS = [
  "segmentTypeId",
  "start",
  "end",
  "location",
  "description",
  "createBlock",
  "travelBeforeMinutes",
  "travelAfterMinutes",
  "note",
] as const;

export type SegmentFormInput = Record<(typeof SEGMENT_FIELDS)[number], string>;

const requiredTime = z.string().transform((value, ctx) => {
  const time = parseLocalDateTime(value);
  if (!time) {
    ctx.addIssue({ code: "custom", message: e.time });
    return z.NEVER;
  }
  return time;
});

const travelMinutes = z
  .string()
  .trim()
  .transform((value) => (value === "" ? "0" : value))
  .pipe(
    z
      .string()
      .regex(/^\d+$/, e.travel)
      .transform(Number)
      .pipe(z.number().max(480, e.travel)),
  );

const checkbox = z.string().transform((value) => value === "on");

export const segmentSchema = z
  .object({
    segmentTypeId: z.string().min(1, e.segmentType),
    start: requiredTime,
    end: requiredTime,
    location: z.string().trim().max(100, e.location),
    description: z.string().trim().max(200, e.description),
    createBlock: checkbox,
    travelBeforeMinutes: travelMinutes,
    travelAfterMinutes: travelMinutes,
    note: z.string().trim().max(200, e.note),
  })
  .refine((segment) => segment.end.getTime() > segment.start.getTime(), {
    path: ["end"],
    message: e.endBeforeStart,
  });

export type SegmentData = z.output<typeof segmentSchema>;

export interface Interval {
  start: Date;
  end: Date;
}

/** Half-open intervals: touching segments do not overlap (CLAUDE.md). */
export function intervalsOverlap(a: Interval, b: Interval): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();
}

/** The first existing interval the new one clashes with, if any. */
export function findOverlap(candidate: Interval, existing: readonly Interval[]): Interval | null {
  return existing.find((other) => intervalsOverlap(candidate, other)) ?? null;
}
