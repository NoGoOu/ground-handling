import { OPTION_ROWS, QUESTION_FIELDS, type QuestionFormInput } from "@/lib/validation/exams";

// The starting values of the exam forms from the stored rows.

export function questionValues(
  question: {
    text: string;
    kind: "SINGLE" | "MULTIPLE" | "TEXT";
    points: number;
    topic: string | null;
    active: boolean;
    options: { text: string; correct: boolean }[];
  } | null,
): QuestionFormInput {
  const values = Object.fromEntries(QUESTION_FIELDS.map((key) => [key, ""])) as QuestionFormInput;
  if (!question) return { ...values, kind: "SINGLE", points: "1", active: "on" };
  const rows = question.options.slice(0, OPTION_ROWS);
  rows.forEach((option, i) => {
    values[`option${i}` as keyof QuestionFormInput] = option.text;
    values[`correct${i}` as keyof QuestionFormInput] = option.correct ? "on" : "";
  });
  const single = rows.findIndex((option) => option.correct);
  return {
    ...values,
    text: question.text,
    kind: question.kind,
    points: String(question.points),
    topic: question.topic ?? "",
    active: question.active ? "on" : "",
    correctSingle: question.kind === "SINGLE" && single >= 0 ? String(single) : "",
  };
}
