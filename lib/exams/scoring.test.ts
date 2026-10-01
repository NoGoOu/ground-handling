import { describe, expect, it } from "vitest";
import {
  attemptResult,
  attemptState,
  autoPoints,
  cleanChoices,
  deadlineOf,
  formatPoints,
  scoreChoice,
  type GivenAnswer,
} from "@/lib/exams/scoring";
import { buildSnapshot, examineeQuestions, maxPointsOf, sheetProblems, type SnapshotQuestion } from "@/lib/exams/snapshot";

// The e-exam (CLAUDE.md, 10. mérföldkő, "Elméleti e-vizsga").

const single: SnapshotQuestion = {
  questionId: "q1",
  text: "Mi a PRM?",
  kind: "SINGLE",
  points: 2,
  topic: null,
  options: [
    { text: "Csökkent mozgásképességű utas", correct: true },
    { text: "Poggyász", correct: false },
    { text: "Rakomány", correct: false },
  ],
};
const multiple: SnapshotQuestion = {
  questionId: "q2",
  text: "Melyek veszélyes áruk?",
  kind: "MULTIPLE",
  points: 3,
  topic: "DG",
  options: [
    { text: "Lítiumelem", correct: true },
    { text: "Gyúlékony folyadék", correct: true },
    { text: "Könyv", correct: false },
    { text: "Sűrített gáz", correct: true },
  ],
};
const written: SnapshotQuestion = { questionId: "q3", text: "Írd le a pushback menetét.", kind: "TEXT", points: 5, topic: null, options: [] };

describe("a choice question", () => {
  it("scores a single choice only when the one chosen is right", () => {
    expect(scoreChoice(single, [0], "ALL_OR_NOTHING")).toBe(2);
    expect(scoreChoice(single, [1], "ALL_OR_NOTHING")).toBe(0);
    expect(scoreChoice(single, [], "ALL_OR_NOTHING")).toBe(0);
  });

  it("scores several right answers only when fully right, by default", () => {
    expect(scoreChoice(multiple, [0, 1, 3], "ALL_OR_NOTHING")).toBe(3);
    expect(scoreChoice(multiple, [3, 1, 0], "ALL_OR_NOTHING")).toBe(3);
    expect(scoreChoice(multiple, [0, 1], "ALL_OR_NOTHING")).toBe(0);
    expect(scoreChoice(multiple, [0, 1, 2, 3], "ALL_OR_NOTHING")).toBe(0);
  });

  it("scores several right answers in proportion when the sheet says so, never below zero", () => {
    // Two of three right: 2/3 of 3 points.
    expect(scoreChoice(multiple, [0, 1], "PROPORTIONAL")).toBeCloseTo(2);
    // Three right and one wrong: (3 − 1) / 3.
    expect(scoreChoice(multiple, [0, 1, 2, 3], "PROPORTIONAL")).toBeCloseTo(2);
    expect(scoreChoice(multiple, [0, 1, 3], "PROPORTIONAL")).toBe(3);
    expect(scoreChoice(multiple, [2], "PROPORTIONAL")).toBe(0);
    expect(scoreChoice(multiple, [0, 2], "PROPORTIONAL")).toBe(0);
  });

  it("cleans the choices: inside the question, each once, one for a single choice", () => {
    expect(cleanChoices(multiple, [3, 1, 1, 9, -1, 2.5])).toEqual([1, 3]);
    expect(cleanChoices(single, [2, 0])).toEqual([0]);
    expect(cleanChoices(written, [0])).toEqual([]);
    // A duplicate does not count twice in proportion.
    expect(scoreChoice(multiple, [0, 0, 0], "PROPORTIONAL")).toBeCloseTo(1);
  });
});

describe("the points on submission", () => {
  const snapshot = { questions: [single, multiple, written], multipleScoring: "ALL_OR_NOTHING" as const };
  const answers = (entries: [number, GivenAnswer][]) => new Map(entries);

  it("scores the choice questions and leaves a written answer to the examiner", () => {
    expect(
      autoPoints(snapshot, answers([
        [0, { choices: [0], text: null }],
        [1, { choices: [0, 1], text: null }],
        [2, { choices: [], text: "Hátrafelé tolás…" }],
      ])),
    ).toEqual([2, 0, null]);
  });

  it("gives nothing for an unanswered question, written or not", () => {
    expect(autoPoints(snapshot, answers([[2, { choices: [], text: "   " }]]))).toEqual([0, 0, 0]);
  });
});

describe("the result of an attempt", () => {
  it("has none while written answers wait", () => {
    expect(attemptResult(80, 10, [2, 3, null])).toEqual({ scored: 5, max: 10, pending: 1, percent: null, passed: null });
  });

  it("passes on reaching the pass mark exactly, and shows the percent rounded down", () => {
    expect(attemptResult(80, 10, [2, 3, 3])).toMatchObject({ percent: 80, passed: true });
    expect(attemptResult(80, 10, [2, 3, 2.9])).toMatchObject({ percent: 79, passed: false });
    // 2/3 + 1/3 of a point is one whole point, despite floats.
    expect(attemptResult(100, 1, [2 / 3, 1 / 3])).toMatchObject({ percent: 100, passed: true });
    // 79.99… % is not 80 %.
    expect(attemptResult(80, 3, [2.3999])).toMatchObject({ percent: 79, passed: false });
  });

  it("fails an empty sheet rather than dividing by zero", () => {
    expect(attemptResult(80, 0, [])).toMatchObject({ percent: 0, passed: false });
  });

  it("formats fractions of points", () => {
    expect(formatPoints(2)).toBe("2");
    expect(formatPoints(2 / 3)).toBe("0,67");
  });
});

describe("the time and the state of an attempt", () => {
  const at = (minute: number) => new Date(Date.UTC(2026, 9, 1, 8, minute));

  it("runs the time limit from the examinee's first look", () => {
    expect(deadlineOf(at(5), 30)).toEqual(at(35));
    expect(deadlineOf(at(5), null)).toBeNull();
  });

  it("is open until handed in or until the time is up", () => {
    const base = { startedAt: null, deadline: null, submittedAt: null, passed: null };
    expect(attemptState(base, at(0))).toBe("NOT_STARTED");
    expect(attemptState({ ...base, startedAt: at(5), deadline: at(35) }, at(34))).toBe("OPEN");
    expect(attemptState({ ...base, startedAt: at(5), deadline: at(35) }, at(35))).toBe("EXPIRED");
    expect(attemptState({ ...base, startedAt: at(5), submittedAt: at(20) }, at(40))).toBe("GRADING");
    expect(attemptState({ ...base, startedAt: at(5), submittedAt: at(20), passed: true }, at(40))).toBe("PASSED");
    expect(attemptState({ ...base, startedAt: at(5), submittedAt: at(20), passed: false }, at(40))).toBe("FAILED");
  });
});

describe("the copy of a sheet", () => {
  const sheet = {
    id: "s1",
    name: "DG alap",
    trainingId: "t1",
    timeLimitMinutes: 30,
    multipleScoring: "PROPORTIONAL" as const,
    questions: [
      { order: 2, question: { id: "q3", text: written.text, kind: "TEXT" as const, points: 5, topic: null, options: [] } },
      {
        order: 1,
        question: {
          id: "q1",
          text: single.text,
          kind: "SINGLE" as const,
          points: 2,
          topic: null,
          options: [
            { order: 2, text: "Poggyász", correct: false },
            { order: 1, text: "Csökkent mozgásképességű utas", correct: true },
          ],
        },
      },
    ],
  };

  it("keeps the questions and the options in their order, with the pass mark", () => {
    const snapshot = buildSnapshot(sheet, 80);
    expect(snapshot.questions.map((q) => q.questionId)).toEqual(["q1", "q3"]);
    expect(snapshot.questions[0].options.map((o) => o.text)).toEqual(["Csökkent mozgásképességű utas", "Poggyász"]);
    expect(snapshot).toMatchObject({ passPercent: 80, timeLimitMinutes: 30, multipleScoring: "PROPORTIONAL" });
    expect(maxPointsOf(snapshot)).toBe(7);
  });

  it("shows the examinee the questions without the right answers", () => {
    const shown = examineeQuestions(buildSnapshot(sheet, 80));
    expect(shown[0]).toEqual({ text: single.text, kind: "SINGLE", points: 2, options: ["Csökkent mozgásképességű utas", "Poggyász"] });
    expect(JSON.stringify(shown)).not.toContain("correct");
  });

  it("finds a sheet that cannot be taken", () => {
    expect(sheetProblems({ questions: [] })).toEqual(["noQuestions"]);
    expect(sheetProblems({ questions: [single, multiple, written] })).toEqual([]);
    const noRight = { ...single, options: single.options.map((o) => ({ ...o, correct: false })) };
    const twoForSingle = { ...single, options: single.options.map((o) => ({ ...o, correct: true })) };
    const oneOption = { ...multiple, options: [multiple.options[0]] };
    expect(sheetProblems({ questions: [noRight, twoForSingle, oneOption] }).sort()).toEqual(["noRightAnswer", "singleWithSeveral", "tooFewOptions"]);
  });
});
