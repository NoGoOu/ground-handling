import Link from "next/link";
import { listQuestions } from "@/lib/data/exams";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canEditExams } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { saveQuestionAction } from "../actions";
import { QuestionForm } from "../forms";
import { questionValues } from "../values";

// The question bank (CLAUDE.md, 10. mérföldkő, "Elméleti e-vizsga").

const q = messages.exams.questions;

export default async function QuestionsPage() {
  await requireCapability(canEditExams);
  const questions = await listQuestions();
  return (
    <div className="flex flex-col gap-4">
      <Link href="/training/exams" className="self-start text-sm text-sky-700 hover:underline">
        {messages.exams.back}
      </Link>
      <h1 className="text-2xl font-bold">{q.title}</h1>
      <p className="max-w-3xl text-sm text-neutral-600">{q.hint}</p>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{q.create}</h2>
        <QuestionForm action={saveQuestionAction.bind(null, null)} initial={questionValues(null)} submitLabel={q.create} />
      </section>

      {questions.length === 0 ? (
        <p className="text-neutral-600">{q.empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
          {questions.map((question) => (
            <li key={question.id} className={`flex flex-wrap items-start justify-between gap-2 px-4 py-2 text-sm ${question.active ? "" : "text-neutral-400"}`}>
              <span className="flex max-w-3xl flex-col">
                <span className="font-medium whitespace-pre-line">{question.text}</span>
                <span className="text-neutral-500">
                  {fmt(q.row, { kind: q.kinds[question.kind], points: question.points })} · {question.topic ?? q.noTopic}
                  {!question.active && <> · {messages.exams.inactive}</>}
                </span>
              </span>
              <Link href={`/training/exams/questions/${question.id}`} className="text-sky-700 hover:underline">
                {messages.exams.edit}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
