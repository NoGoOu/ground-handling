import { z } from "zod";
import { messages } from "@/lib/messages";

const e = messages.segmentTypeForm.errors;

/** Segment types are named by the planner; the code is a short stable key. */
export const segmentTypeSchema = z.object({
  name: z.string().trim().min(1, e.name).max(60, e.name),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .pipe(z.string().regex(/^[A-Z0-9_]{2,10}$/, e.code)),
  operative: z.boolean(),
  active: z.boolean(),
});

export type SegmentTypeInput = z.infer<typeof segmentTypeSchema>;
