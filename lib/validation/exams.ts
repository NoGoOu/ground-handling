import { z } from "zod";
import { messages } from "@/lib/messages";

// Forms of the exams (CLAUDE.md, 10. mérföldkő): the question bank, the exam
// sheets, the parts of a training with its OJT requirement, and the criteria
// of the practical exam.

const e = messages.exams;
const checkbox = z.string().transform((value) => value === "on");

function intIn(min: number, max: number, message: string) {
  return z
    .string()
    .trim()
    .regex(/^\d{1,4}$/, message)
    .transform(Number)
    .pipe(z.number().int().min(min, message).max(max, message));
}

function optionalIntIn(min: number, max: number, message: string) {
  return z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{1,4}$/.test(value), message)
    .transform((value) => (value === "" ? null : Number(value)))
    .pipe(z.number().int().min(min, message).max(max, message).nullable());
}

/** The question form has this many option rows; empty rows do not count. */
export const OPTION_ROWS = 6;
export const OPTION_FIELDS = Array.from({ length: OPTION_ROWS }, (_, i) => [`option${i}`, `correct${i}`] as const).flat();
/** A single right answer comes from one radio group: correctSingle names its row. */
export const QUESTION_FIELDS = ["text", "kind", "points", "topic", "active", "correctSingle", ...OPTION_FIELDS] as const;
export type QuestionFormInput = Record<(typeof QUESTION_FIELDS)[number], string>;

const q = e.questions.errors;

export const questionSchema = z
  .object({
    text: z.string().trim().min(1, q.text).max(2000, q.text),
    kind: z.enum(["SINGLE", "MULTIPLE", "TEXT"], { message: q.kind }),
    points: intIn(1, 100, q.points),
    topic: z
      .string()
      .trim()
      .max(60, q.topic)
      .transform((value) => value || null),
    active: checkbox,
    // Filled from the option rows by parseQuestion.
    options: z.array(z.object({ text: z.string().max(500, q.option), correct: z.boolean() })),
  })
  .superRefine((question, ctx) => {
    if (question.kind === "TEXT") return;
    const right = question.options.filter((option) => option.correct).length;
    if (question.options.length < 2) ctx.addIssue({ code: "custom", path: ["options"], message: q.tooFewOptions });
    else if (question.kind === "SINGLE" && right !== 1) ctx.addIssue({ code: "custom", path: ["options"], message: q.single });
    else if (question.kind === "MULTIPLE" && right < 1) ctx.addIssue({ code: "custom", path: ["options"], message: q.multiple });
  })
  // A written answer has no options.
  .transform((question) => ({ ...question, options: question.kind === "TEXT" ? [] : question.options }));

/** The question form's values, the option rows gathered into a list of the filled ones. */
export function parseQuestion(values: QuestionFormInput) {
  const single = values.kind === "SINGLE" && values.correctSingle !== "";
  const options = Array.from({ length: OPTION_ROWS }, (_, i) => ({
    text: values[`option${i}` as keyof QuestionFormInput].trim(),
    correct: single ? values.correctSingle === String(i) : values[`correct${i}` as keyof QuestionFormInput] === "on",
  })).filter((option) => option.text !== "");
  return questionSchema.safeParse({ ...values, options });
}

export const SHEET_FIELDS = ["name", "trainingId", "timeLimitMinutes", "multipleScoring", "active"] as const;
export type SheetFormInput = Record<(typeof SHEET_FIELDS)[number], string>;

const s = e.sheets.errors;

export const sheetSchema = z.object({
  name: z.string().trim().min(1, s.name).max(100, s.name),
  trainingId: z.string().trim().min(1, s.training),
  timeLimitMinutes: optionalIntIn(1, 600, s.timeLimit),
  multipleScoring: z.enum(["ALL_OR_NOTHING", "PROPORTIONAL"], { message: s.scoring }),
  active: checkbox,
});

export const PARTS_FIELDS = ["theoryPart", "practicalPart", "ojtRequiredCount", "ojtMinCompletenessPercent", "ojtMinOnTimePercent"] as const;
export type PartsFormInput = Record<(typeof PARTS_FIELDS)[number], string>;

const c = e.course.errors;

export const partsSchema = z.object({
  theoryPart: checkbox,
  practicalPart: checkbox,
  ojtRequiredCount: intIn(1, 200, c.requiredCount),
  ojtMinCompletenessPercent: intIn(0, 100, c.percent),
  ojtMinOnTimePercent: intIn(0, 100, c.percent),
});

/**
 * The parts against the training's exam: a theory part needs the exam and its
 * pass mark; a training with an exam takes its theory part along with the
 * practical one, since the exam result goes into the released record.
 */
export function partsProblem(
  parts: { theoryPart: boolean; practicalPart: boolean },
  training: { hasExam: boolean; passPercent: number | null },
): "theoryNeedsExam" | "examNeedsTheory" | null {
  if (parts.theoryPart && !(training.hasExam && training.passPercent !== null)) return "theoryNeedsExam";
  if (training.hasExam && parts.practicalPart && !parts.theoryPart) return "examNeedsTheory";
  return null;
}

export const CRITERION_FIELDS = ["text", "active"] as const;
export type CriterionFormInput = Record<(typeof CRITERION_FIELDS)[number], string>;

export const criterionSchema = z.object({
  text: z.string().trim().min(1, c.criterion).max(300, c.criterion),
  active: checkbox,
});
