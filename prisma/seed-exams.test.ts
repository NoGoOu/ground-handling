import { describe, expect, it } from "vitest";
import { attemptResult, autoPoints } from "@/lib/exams/scoring";
import { buildSnapshot, maxPointsOf, sheetProblems } from "@/lib/exams/snapshot";
import { parseQuestion, QUESTION_FIELDS, type QuestionFormInput } from "@/lib/validation/exams";
import { SEED_USERS } from "./seed-data";
import { SEED_ATTEMPTS, SEED_CRITERIA, SEED_EXAM_TRAININGS, SEED_QUESTIONS, SEED_SHEETS, type SeedQuestionKey } from "./seed-exams";
import { SEED_COURSES } from "./seed-training";

// The exam demo data (CLAUDE.md, 10. mérföldkő, 9. lépés).

function snapshotOf(name: string) {
  const sheet = SEED_SHEETS.find((s) => s.name === name)!;
  const course = SEED_COURSES.find((c) => c.name === sheet.course)!;
  return buildSnapshot(
    {
      id: name,
      name,
      trainingId: course.name,
      timeLimitMinutes: sheet.timeLimitMinutes,
      multipleScoring: sheet.multipleScoring,
      questions: sheet.questions.map((key: SeedQuestionKey, order) => ({
        order,
        question: { id: key, ...SEED_QUESTIONS[key], options: SEED_QUESTIONS[key].options.map((o, i) => ({ ...o, order: i })) },
      })),
    },
    course.passPercent!,
  );
}

describe("the demo exams", () => {
  it("has a mentor and an examiner among the users", () => {
    const roles = SEED_USERS.flatMap((u) => u.roles as readonly string[]);
    expect(roles.filter((r) => r === "Mentor")).toHaveLength(1);
    expect(roles.filter((r) => r === "Vizsgáztató")).toHaveLength(1);
  });

  it("has a training with both parts and a theory-only one, both with an exam", () => {
    for (const training of SEED_EXAM_TRAININGS) {
      expect(SEED_COURSES.find((c) => c.name === training.course)!.hasExam).toBe(true);
    }
    expect(SEED_EXAM_TRAININGS.filter((t) => t.theoryPart && t.practicalPart)).toHaveLength(1);
    expect(SEED_CRITERIA.texts.length).toBeGreaterThanOrEqual(3);
    // At least one knock-out criterion, among the criteria.
    expect(SEED_CRITERIA.knockOut.length).toBeGreaterThanOrEqual(1);
    for (const text of SEED_CRITERIA.knockOut) expect(SEED_CRITERIA.texts).toContain(text);
  });

  it("has questions the form would accept, and sheets that can be taken", () => {
    for (const question of Object.values(SEED_QUESTIONS)) {
      const values = Object.fromEntries(QUESTION_FIELDS.map((key) => [key, ""])) as QuestionFormInput;
      question.options.forEach((option, i) => {
        values[`option${i}` as keyof QuestionFormInput] = option.text;
        values[`correct${i}` as keyof QuestionFormInput] = option.correct ? "on" : "";
      });
      const parsed = parseQuestion({ ...values, text: question.text, kind: question.kind, points: String(question.points), topic: question.topic ?? "", active: "on" });
      expect(parsed.success, question.text).toBe(true);
    }
    for (const sheet of SEED_SHEETS) expect(sheetProblems(snapshotOf(sheet.name))).toEqual([]);
    expect(maxPointsOf(snapshotOf("Helyőrző A – elméleti vizsga"))).toBe(10);
  });

  it("fails the half-way attempt: 5 of 10 points against a pass mark of 80%", () => {
    const { failed } = SEED_ATTEMPTS;
    const snapshot = snapshotOf(failed.sheet);
    const points = autoPoints(snapshot, new Map(failed.answers.map((answer, i) => [i, answer])));
    expect(points).toEqual([2, 0, 1, null]);
    const graded = points.map((value) => value ?? failed.writtenPoints);
    expect(attemptResult(snapshot.passPercent, maxPointsOf(snapshot), graded)).toMatchObject({ scored: 5, percent: 50, passed: false });
  });

  it("passes the refresher, so that it is ready for release", () => {
    const { passed } = SEED_ATTEMPTS;
    const snapshot = snapshotOf(passed.sheet);
    const points = autoPoints(snapshot, new Map(passed.answers.map((answer, i) => [i, answer])));
    expect(attemptResult(snapshot.passPercent, maxPointsOf(snapshot), points)).toMatchObject({ percent: 100, passed: true });
  });
});
