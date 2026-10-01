// The copy an e-exam attempt keeps (CLAUDE.md, 10. mérföldkő, "Kitöltés"):
// the sheet and its questions as they were when the attempt was opened, so
// that later edits of the question bank do not change it. The pass mark is
// copied too, so a result never moves.

export type QuestionKind = "SINGLE" | "MULTIPLE" | "TEXT";
export type MultipleScoring = "ALL_OR_NOTHING" | "PROPORTIONAL";

export interface SnapshotQuestion {
  questionId: string;
  text: string;
  kind: QuestionKind;
  points: number;
  topic: string | null;
  /** None for a written answer. */
  options: { text: string; correct: boolean }[];
}

export interface ExamSnapshot {
  sheetId: string;
  name: string;
  trainingId: string;
  passPercent: number;
  timeLimitMinutes: number | null;
  multipleScoring: MultipleScoring;
  questions: SnapshotQuestion[];
}

export interface SheetForSnapshot {
  id: string;
  name: string;
  trainingId: string;
  timeLimitMinutes: number | null;
  multipleScoring: MultipleScoring;
  questions: {
    question: {
      id: string;
      text: string;
      kind: QuestionKind;
      points: number;
      topic: string | null;
      options: { order: number; text: string; correct: boolean }[];
    };
    order: number;
  }[];
}

/** The copy of a sheet, its questions in the sheet's order and their options in theirs. */
export function buildSnapshot(sheet: SheetForSnapshot, passPercent: number): ExamSnapshot {
  return {
    sheetId: sheet.id,
    name: sheet.name,
    trainingId: sheet.trainingId,
    passPercent,
    timeLimitMinutes: sheet.timeLimitMinutes,
    multipleScoring: sheet.multipleScoring,
    questions: [...sheet.questions]
      .sort((a, b) => a.order - b.order)
      .map(({ question }) => ({
        questionId: question.id,
        text: question.text,
        kind: question.kind,
        points: question.points,
        topic: question.topic,
        options:
          question.kind === "TEXT"
            ? []
            : [...question.options].sort((a, b) => a.order - b.order).map(({ text, correct }) => ({ text, correct })),
      })),
  };
}

export const maxPointsOf = (snapshot: Pick<ExamSnapshot, "questions">) =>
  snapshot.questions.reduce((sum, question) => sum + question.points, 0);

/** What a sheet needs before an attempt can be opened on it. */
export type SheetProblem = "noQuestions" | "noRightAnswer" | "tooFewOptions" | "singleWithSeveral";

export function sheetProblems(snapshot: Pick<ExamSnapshot, "questions">): SheetProblem[] {
  const problems = new Set<SheetProblem>();
  if (snapshot.questions.length === 0) problems.add("noQuestions");
  for (const question of snapshot.questions) {
    if (question.kind === "TEXT") continue;
    const right = question.options.filter((option) => option.correct).length;
    if (question.options.length < 2) problems.add("tooFewOptions");
    if (right === 0) problems.add("noRightAnswer");
    if (question.kind === "SINGLE" && right > 1) problems.add("singleWithSeveral");
  }
  return [...problems];
}

/**
 * What the examinee may see: the questions and the options, never which
 * option is right (CLAUDE.md: the question bank must stay reusable).
 */
export interface ExamineeQuestion {
  text: string;
  kind: QuestionKind;
  points: number;
  options: string[];
}

export function examineeQuestions(snapshot: Pick<ExamSnapshot, "questions">): ExamineeQuestion[] {
  return snapshot.questions.map((question) => ({
    text: question.text,
    kind: question.kind,
    points: question.points,
    options: question.options.map((option) => option.text),
  }));
}

/** Reads a stored copy back; the shape is ours, so a broken one is a bug, not user input. */
export function readSnapshot(value: unknown): ExamSnapshot {
  const snapshot = value as ExamSnapshot;
  if (!snapshot || !Array.isArray(snapshot.questions)) throw new Error("Broken exam snapshot");
  return snapshot;
}
