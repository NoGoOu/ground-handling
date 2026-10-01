import type { ExamSnapshot, MultipleScoring, SnapshotQuestion } from "@/lib/exams/snapshot";

// Scoring an e-exam (CLAUDE.md, 10. mérföldkő, "Javítás"): the system scores
// the choice questions, the examiner the written answers. The result is the
// share of the points in percent; the attempt passes when it reaches the pass
// mark, compared exactly, without rounding.

export interface GivenAnswer {
  choices: readonly number[];
  text: string | null;
}

/** The chosen options cleaned: inside the question, each once, in order; a single choice keeps one at most. */
export function cleanChoices(question: Pick<SnapshotQuestion, "kind" | "options">, choices: readonly number[]): number[] {
  if (question.kind === "TEXT") return [];
  const valid = [...new Set(choices)].filter((index) => Number.isInteger(index) && index >= 0 && index < question.options.length);
  valid.sort((a, b) => a - b);
  return question.kind === "SINGLE" ? valid.slice(0, 1) : valid;
}

/**
 * The points of a choice question. A single choice scores when the one
 * chosen is right. Several right answers score by the sheet's rule: only the
 * fully right answer, or in proportion (right ones marked − wrong ones marked)
 * / all right ones, at least zero.
 */
export function scoreChoice(question: SnapshotQuestion, choices: readonly number[], scoring: MultipleScoring): number {
  const chosen = cleanChoices(question, choices);
  const right = question.options.flatMap((option, index) => (option.correct ? [index] : []));
  if (question.kind === "SINGLE") return chosen.length === 1 && right.includes(chosen[0]) ? question.points : 0;
  const rightMarked = chosen.filter((index) => right.includes(index)).length;
  const wrongMarked = chosen.length - rightMarked;
  if (scoring === "ALL_OR_NOTHING") return rightMarked === right.length && wrongMarked === 0 && right.length > 0 ? question.points : 0;
  if (right.length === 0) return 0;
  return Math.max(0, ((rightMarked - wrongMarked) / right.length) * question.points);
}

/**
 * The points the system gives on submission: one per question, by its place;
 * a written answer waits for the examiner (null). An unanswered question is
 * worth nothing, a written one too.
 */
export function autoPoints(snapshot: Pick<ExamSnapshot, "questions" | "multipleScoring">, answers: ReadonlyMap<number, GivenAnswer>): (number | null)[] {
  return snapshot.questions.map((question, index) => {
    const answer = answers.get(index);
    if (question.kind === "TEXT") return answer?.text?.trim() ? null : 0;
    return scoreChoice(question, answer?.choices ?? [], snapshot.multipleScoring);
  });
}

export interface AttemptResult {
  /** Points given so far. */
  scored: number;
  max: number;
  /** Written answers still to score: until none is left, there is no result. */
  pending: number;
  /** The share of the points, rounded down; null while answers wait. */
  percent: number | null;
  passed: boolean | null;
}

/** Small enough to never change a decision, large enough to absorb float sums (1/3 + 2/3). */
const EPSILON = 1e-9;

/** The share of the points in whole percent, rounded down. */
export function percentOf(scored: number, max: number): number {
  return max === 0 ? 0 : Math.floor((scored * 100) / max + EPSILON);
}

export function attemptResult(passPercent: number, max: number, points: readonly (number | null)[]): AttemptResult {
  const pending = points.filter((value) => value === null).length;
  const scored = points.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  if (pending > 0) return { scored, max, pending, percent: null, passed: null };
  if (max === 0) return { scored, max, pending, percent: 0, passed: false };
  return {
    scored,
    max,
    pending,
    percent: percentOf(scored, max),
    passed: scored * 100 + EPSILON >= passPercent * max,
  };
}

/** The end of the time for an attempt with a limit, from the examinee's first look. */
export function deadlineOf(startedAt: Date, timeLimitMinutes: number | null): Date | null {
  return timeLimitMinutes === null ? null : new Date(startedAt.getTime() + timeLimitMinutes * 60_000);
}

export type AttemptState = "NOT_STARTED" | "OPEN" | "EXPIRED" | "GRADING" | "PASSED" | "FAILED";

/**
 * Where an attempt stands. One whose time is up counts as handed in with the
 * answers saved so far; it is closed the next time anyone looks at it.
 */
export function attemptState(
  attempt: { startedAt: Date | null; deadline: Date | null; submittedAt: Date | null; passed: boolean | null },
  now: Date,
): AttemptState {
  if (!attempt.submittedAt) {
    if (attempt.deadline && now.getTime() >= attempt.deadline.getTime()) return "EXPIRED";
    return attempt.startedAt ? "OPEN" : "NOT_STARTED";
  }
  if (attempt.passed === null) return "GRADING";
  return attempt.passed ? "PASSED" : "FAILED";
}

/** Points shown with at most two decimals: proportional scoring gives fractions. */
export function formatPoints(points: number): string {
  return String(Math.round(points * 100) / 100).replace(".", ",");
}
