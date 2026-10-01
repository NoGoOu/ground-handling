import Link from "next/link";
import { listSheets, listSheetTrainings, sheetSummary } from "@/lib/data/exams";
import { DEFAULT_MULTIPLE_SCORING } from "@/lib/exams/defaults";
import { formatPoints } from "@/lib/exams/scoring";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canEditExams } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { saveSheetAction } from "../actions";
import { SheetForm } from "../forms";

// The exam sheets (CLAUDE.md, 10. mérföldkő, "Elméleti e-vizsga").

const s = messages.exams.sheets;

export default async function SheetsPage() {
  await requireCapability(canEditExams);
  const [sheets, trainings] = await Promise.all([listSheets(), listSheetTrainings()]);
  return (
    <div className="flex flex-col gap-4">
      <Link href="/training/exams" className="self-start text-sm text-sky-700 hover:underline">
        {messages.exams.back}
      </Link>
      <h1 className="text-2xl font-bold">{s.title}</h1>
      <p className="max-w-3xl text-sm text-neutral-600">{s.hint}</p>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{s.create}</h2>
        <SheetForm
          action={saveSheetAction.bind(null, null)}
          initial={{ name: "", trainingId: "", timeLimitMinutes: "", multipleScoring: DEFAULT_MULTIPLE_SCORING, active: "on" }}
          trainings={trainings}
          submitLabel={s.create}
        />
      </section>

      {sheets.length === 0 ? (
        <p className="text-neutral-600">{s.empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
          {sheets.map((sheet) => {
            const summary = sheetSummary(sheet);
            return (
              <li key={sheet.id} className={`flex flex-wrap items-start justify-between gap-2 px-4 py-2 text-sm ${sheet.active ? "" : "text-neutral-400"}`}>
                <span className="flex flex-col">
                  <span className="font-medium">{sheet.name}</span>
                  <span className="text-neutral-500">
                    {fmt(s.row, {
                      training: sheet.training.name,
                      count: summary.count,
                      points: formatPoints(summary.points),
                      limit: sheet.timeLimitMinutes ? fmt(s.minutes, { n: sheet.timeLimitMinutes }) : s.noTimeLimit,
                    })}
                    {!sheet.active && <> · {messages.exams.inactive}</>}
                  </span>
                  {summary.problems.map((problem) => (
                    <span key={problem} className="text-orange-700">
                      ⚠ {s.problems[problem]}
                    </span>
                  ))}
                </span>
                <Link href={`/training/exams/sheets/${sheet.id}`} className="text-sky-700 hover:underline">
                  {messages.exams.edit}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
