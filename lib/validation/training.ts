import { z } from "zod";
import { messages } from "@/lib/messages";
import { parseLocalDate } from "@/lib/time";

// Forms of the training data (CLAUDE.md, 6. mérföldkő).

const q = messages.training.qualifications.errors;
const c = messages.training.courses.errors;
const r = messages.training.records.errors;

const checkbox = z.string().transform((value) => value === "on");

/** An optional whole number: empty is null. */
function optionalInt(min: number, max: number, message: string) {
  return z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d+$/.test(value), message)
    .transform((value) => (value === "" ? null : Number(value)))
    .pipe(z.number().min(min, message).max(max, message).nullable());
}

const day = (message: string) =>
  z
    .string()
    .trim()
    .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && parseLocalDate(value) !== null, message);

const optionalDay = (message: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === "" || (/^\d{4}-\d{2}-\d{2}$/.test(value) && parseLocalDate(value) !== null), message)
    .transform((value) => value || null);

export const QUALIFICATION_FIELDS = ["name", "code", "validityMonths", "active"] as const;
export type QualificationFormInput = Record<(typeof QUALIFICATION_FIELDS)[number], string>;

export const qualificationSchema = z.object({
  name: z.string().trim().min(1, q.name).max(80, q.name),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .pipe(z.string().regex(/^[A-Z0-9-]{1,12}$/, q.code)),
  validityMonths: optionalInt(1, 600, q.months),
  active: checkbox,
});

export const COURSE_FIELDS = ["name", "qualificationId", "hasExam", "passPercent"] as const;
export type CourseFormInput = Record<(typeof COURSE_FIELDS)[number], string>;

export const courseSchema = z
  .object({
    name: z.string().trim().min(1, c.name).max(100, c.name),
    qualificationId: z
      .string()
      .trim()
      .transform((value) => value || null),
    hasExam: checkbox,
    passPercent: optionalInt(0, 100, c.passPercent),
  })
  .refine((course) => !course.hasExam || course.passPercent !== null, { path: ["passPercent"], message: c.passPercent })
  // Without an exam there is no pass mark.
  .transform((course) => ({ ...course, passPercent: course.hasExam ? course.passPercent : null }));

export const RECORD_FIELDS = [
  "userId",
  "trainingId",
  "completedOn",
  "examPercent",
  "passed",
  "validUntil",
  "validUntilManual",
  "note",
] as const;
export type RecordFormInput = Record<(typeof RECORD_FIELDS)[number], string>;

export const recordSchema = z.object({
  userId: z.string().trim().min(1, r.person),
  trainingId: z.string().trim().min(1, r.course),
  completedOn: day(r.day),
  examPercent: optionalInt(0, 100, r.examPercent),
  passed: checkbox,
  validUntil: optionalDay(r.day),
  validUntilManual: checkbox,
  note: z
    .string()
    .trim()
    .max(500, r.note)
    .transform((value) => value || null),
});
