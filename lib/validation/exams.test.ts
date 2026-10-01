import { describe, expect, it } from "vitest";
import { messages } from "@/lib/messages";
import {
  criterionSchema,
  OPTION_ROWS,
  parseQuestion,
  partsProblem,
  partsSchema,
  QUESTION_FIELDS,
  sheetSchema,
  type QuestionFormInput,
} from "@/lib/validation/exams";

const q = messages.exams.questions.errors;

function question(values: Partial<QuestionFormInput>): QuestionFormInput {
  const empty = Object.fromEntries(QUESTION_FIELDS.map((key) => [key, ""])) as QuestionFormInput;
  return { ...empty, text: "Mi a PRM?", kind: "SINGLE", points: "1", active: "on", ...values };
}

describe("the question form", () => {
  it("gathers the filled option rows and keeps a single right answer", () => {
    const parsed = parseQuestion(question({ option0: "Utas", correct0: "on", option2: "Rakomány", option5: "  " }));
    expect(parsed.success && parsed.data).toEqual({
      text: "Mi a PRM?",
      kind: "SINGLE",
      points: 1,
      topic: null,
      active: true,
      options: [
        { text: "Utas", correct: true },
        { text: "Rakomány", correct: false },
      ],
    });
    expect(OPTION_ROWS).toBe(6);
  });

  it("needs two options and the right number of right ones", () => {
    const issue = (values: Partial<QuestionFormInput>) => {
      const parsed = parseQuestion(question(values));
      return parsed.success ? null : parsed.error.issues[0].message;
    };
    expect(issue({ option0: "Utas", correct0: "on" })).toBe(q.tooFewOptions);
    expect(issue({ option0: "Utas", option1: "Rakomány" })).toBe(q.single);
    expect(issue({ option0: "Utas", correct0: "on", option1: "Rakomány", correct1: "on" })).toBe(q.single);
    expect(issue({ kind: "MULTIPLE", option0: "Utas", option1: "Rakomány" })).toBe(q.multiple);
    expect(issue({ kind: "MULTIPLE", option0: "Utas", correct0: "on", option1: "Rakomány", correct1: "on" })).toBeNull();
    expect(issue({ points: "0", option0: "a", correct0: "on", option1: "b" })).toBe(q.points);
    expect(issue({ text: " ", option0: "a", correct0: "on", option1: "b" })).toBe(q.text);
  });

  it("reads a single right answer from its radio group", () => {
    const parsed = parseQuestion(question({ option0: "Utas", option1: "Rakomány", correctSingle: "1", correct0: "on" }));
    expect(parsed.success && parsed.data.options).toEqual([
      { text: "Utas", correct: false },
      { text: "Rakomány", correct: true },
    ]);
  });

  it("drops the options of a written answer", () => {
    const parsed = parseQuestion(question({ kind: "TEXT", points: "5", topic: " DG ", option0: "maradék" }));
    expect(parsed.success && parsed.data).toMatchObject({ kind: "TEXT", points: 5, topic: "DG", options: [] });
  });
});

describe("the exam sheet form", () => {
  it("takes an optional time limit and the scoring of several right answers", () => {
    const base = { name: "DG alap", trainingId: "t1", timeLimitMinutes: "", multipleScoring: "ALL_OR_NOTHING", active: "on" };
    expect(sheetSchema.parse(base)).toEqual({ name: "DG alap", trainingId: "t1", timeLimitMinutes: null, multipleScoring: "ALL_OR_NOTHING", active: true });
    expect(sheetSchema.parse({ ...base, timeLimitMinutes: "30", multipleScoring: "PROPORTIONAL" })).toMatchObject({
      timeLimitMinutes: 30,
      multipleScoring: "PROPORTIONAL",
    });
    expect(sheetSchema.safeParse({ ...base, timeLimitMinutes: "0" }).success).toBe(false);
    expect(sheetSchema.safeParse({ ...base, multipleScoring: "SOMETIMES" }).success).toBe(false);
  });
});

describe("the parts of a training", () => {
  it("takes the OJT requirement as parameters", () => {
    const parsed = partsSchema.parse({
      theoryPart: "on",
      practicalPart: "on",
      ojtRequiredCount: "12",
      ojtMinCompletenessPercent: "90",
      ojtMinOnTimePercent: "0",
    });
    expect(parsed).toEqual({ theoryPart: true, practicalPart: true, ojtRequiredCount: 12, ojtMinCompletenessPercent: 90, ojtMinOnTimePercent: 0 });
    expect(partsSchema.safeParse({ ...parsed, theoryPart: "", practicalPart: "", ojtRequiredCount: "0", ojtMinCompletenessPercent: "90", ojtMinOnTimePercent: "0" }).success).toBe(false);
    expect(partsSchema.safeParse({ theoryPart: "", practicalPart: "", ojtRequiredCount: "1", ojtMinCompletenessPercent: "101", ojtMinOnTimePercent: "0" }).success).toBe(false);
  });

  it("allows a theory part only with an exam, and takes it along with practice when there is one", () => {
    const exam = { hasExam: true, passPercent: 80 };
    const none = { hasExam: false, passPercent: null };
    expect(partsProblem({ theoryPart: true, practicalPart: false }, none)).toBe("theoryNeedsExam");
    expect(partsProblem({ theoryPart: true, practicalPart: true }, exam)).toBeNull();
    expect(partsProblem({ theoryPart: false, practicalPart: true }, exam)).toBe("examNeedsTheory");
    expect(partsProblem({ theoryPart: false, practicalPart: true }, none)).toBeNull();
    expect(partsProblem({ theoryPart: false, practicalPart: false }, exam)).toBeNull();
  });
});

describe("a criterion of the practical exam", () => {
  it("is a short text", () => {
    expect(criterionSchema.parse({ text: " Biztonságos pushback ", active: "on", knockOut: "" })).toEqual({
      text: "Biztonságos pushback",
      active: true,
      knockOut: false,
    });
    expect(criterionSchema.parse({ text: "Biztonság", active: "on", knockOut: "on" }).knockOut).toBe(true);
    expect(criterionSchema.safeParse({ text: "", active: "", knockOut: "" }).success).toBe(false);
  });
});
