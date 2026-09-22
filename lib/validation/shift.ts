import { z } from "zod";
import { messages } from "@/lib/messages";
import { parseLocalDateTime } from "@/lib/time";
import { windowsOverlap, type TimeWindow } from "@/lib/turnaround";

const e = messages.shiftForm.errors;

export const SHIFT_FIELDS = ["userId", "startsAt", "endsAt", "note"] as const;
export type ShiftFormInput = Record<(typeof SHIFT_FIELDS)[number], string>;

const requiredTime = z.string().transform((value, ctx) => {
  const time = parseLocalDateTime(value);
  if (!time) {
    ctx.addIssue({ code: "custom", message: e.time });
    return z.NEVER;
  }
  return time;
});

export const shiftSchema = z
  .object({
    userId: z.string().min(1, e.agent),
    startsAt: requiredTime,
    endsAt: requiredTime,
    note: z
      .string()
      .trim()
      .max(200, e.note)
      .transform((value) => (value === "" ? null : value)),
  })
  // A shift may cross midnight, but it has to end after it starts.
  .refine((s) => s.endsAt.getTime() > s.startsAt.getTime(), { path: ["endsAt"], message: e.endBeforeStart });

export type ShiftData = z.output<typeof shiftSchema>;

/**
 * The same agent must not have two overlapping shifts. Windows are half-open,
 * so a shift ending exactly when the next starts is fine.
 */
export function findOverlappingShift<T extends TimeWindow & { id: string }>(
  existing: readonly T[],
  candidate: { startsAt: Date; endsAt: Date; id?: string },
): T | null {
  const window = { start: candidate.startsAt, end: candidate.endsAt };
  return existing.find((shift) => shift.id !== candidate.id && windowsOverlap(shift, window)) ?? null;
}
