import Link from "next/link";
import { notFound } from "next/navigation";
import { FormMessage } from "@/components/form-field";
import { getSheet, listQuestions, listSheetTrainings, sheetSummary } from "@/lib/data/exams";
import { formatPoints } from "@/lib/exams/scoring";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canEditExams } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { addSheetQuestionAction, moveSheetQuestionAction, removeSheetQuestionAction, saveSheetAction } from "../../actions";
import { AddSheetQuestionForm, RowButton, SheetForm } from "../../forms";

// One exam sheet: its settings and its questions in order (CLAUDE.md,
// 10. mérföldkő). An attempt takes a copy when it is opened, so changes here
// only reach the attempts opened later.

const e = messages.exams;
const s = e.sheets;
const short = (text: string) => (text.length > 90 ? `${text.slice(0, 90)}…` : text);

export default async function SheetPage(props: PageProps<"/training/exams/sheets/[id]">) {
  await requireCapability(canEditExams);
  const { id } = await props.params;
  const { created } = await props.searchParams;
  const [sheet, trainings, questions] = await Promise.all([getSheet(id), listSheetTrainings(), listQuestions()]);
  if (!sheet) notFound();
  const summary = sheetSummary(sheet);
  const onSheet = new Set(sheet.questions.map((entry) => entry.questionId));
  const addable = questions
    .filter((question) => question.active && !onSheet.has(question.id))
    .map((question) => ({ id: question.id, label: `${short(question.text)} (${e.questions.kinds[question.kind]}, ${question.points} p)` }));

  return (
    <div className="flex flex-col gap-4">
      <Link href="/training/exams/sheets" className="self-start text-sm text-sky-700 hover:underline">
        {s.title}
      </Link>
      <h1 className="text-2xl font-bold">{sheet.name}</h1>
      {created && <FormMessage notice={s.created} />}

      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <SheetForm
          action={saveSheetAction.bind(null, sheet.id)}
          initial={{
            name: sheet.name,
            trainingId: sheet.trainingId,
            timeLimitMinutes: sheet.timeLimitMinutes === null ? "" : String(sheet.timeLimitMinutes),
            multipleScoring: sheet.multipleScoring,
            active: sheet.active ? "on" : "",
          }}
          trainings={trainings}
          submitLabel={messages.form.save}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{s.questionsTitle}</h2>
        <p className="text-sm text-neutral-600">
          {fmt(s.total, { count: summary.count, points: formatPoints(summary.points), pass: sheet.training.passPercent ?? "–" })}
        </p>
        {summary.problems.map((problem) => (
          <p key={problem} className="text-sm text-orange-700">
            ⚠ {s.problems[problem]}
          </p>
        ))}
        {sheet.questions.length === 0 ? (
          <p className="text-sm text-neutral-600">{s.noQuestions}</p>
        ) : (
          <ol className="flex flex-col divide-y divide-neutral-100">
            {sheet.questions.map((entry, index) => (
              <li key={entry.id} className="flex flex-wrap items-start justify-between gap-2 py-2 text-sm">
                <span className={`flex max-w-3xl flex-col ${entry.question.active ? "" : "text-neutral-400 line-through"}`}>
                  <span>
                    {index + 1}. {entry.question.text}
                  </span>
                  <span className="text-neutral-500">
                    {fmt(e.questions.row, { kind: e.questions.kinds[entry.question.kind], points: entry.question.points })}
                    {!entry.question.active && <> · {s.inactiveQuestion}</>}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  {index > 0 && <RowButton action={moveSheetQuestionAction.bind(null, entry.id, -1)} label={e.moveUp} />}
                  {index < sheet.questions.length - 1 && <RowButton action={moveSheetQuestionAction.bind(null, entry.id, 1)} label={e.moveDown} />}
                  <RowButton action={removeSheetQuestionAction.bind(null, entry.id)} label={e.remove} />
                  <Link href={`/training/exams/questions/${entry.questionId}`} className="ml-1 text-sky-700 hover:underline">
                    {e.edit}
                  </Link>
                </span>
              </li>
            ))}
          </ol>
        )}
        <AddSheetQuestionForm action={addSheetQuestionAction.bind(null, sheet.id)} questions={addable} />
      </section>
    </div>
  );
}
