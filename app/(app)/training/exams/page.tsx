import Link from "next/link";
import { listExamTrainings } from "@/lib/data/exams";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canEditExams } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";

// The exams (CLAUDE.md, 10. mérföldkő): the question bank, the exam sheets,
// and per training its parts, OJT requirement and practical criteria.

const e = messages.exams;

export default async function ExamsPage() {
  await requireCapability(canEditExams);
  const trainings = await listExamTrainings();
  return (
    <div className="flex flex-col gap-4">
      <Link href="/training" className="self-start text-sm text-sky-700 hover:underline">
        {messages.training.back}
      </Link>
      <h1 className="text-2xl font-bold">{e.title}</h1>
      <p className="max-w-3xl text-sm text-neutral-600">{e.intro}</p>
      <div className="flex flex-wrap gap-2">
        <Link href="/training/exams/questions" className="btn btn-secondary">
          {e.questionsLink}
        </Link>
        <Link href="/training/exams/sheets" className="btn btn-secondary">
          {e.sheetsLink}
        </Link>
      </div>

      <section className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{e.trainingsTitle}</h2>
        <p className="text-sm text-neutral-600">{e.trainingsHint}</p>
        <ul className="flex flex-col divide-y divide-neutral-100">
          {trainings.map((training) => {
            const parts = [training.theoryPart && e.parts.theory, training.practicalPart && e.parts.practical].filter(Boolean).join(" + ");
            return (
              <li key={training.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="flex flex-col">
                  <span className="font-medium">
                    {training.name}
                    {training.qualification && <span className="ml-2 font-mono text-xs text-neutral-500">{training.qualification.code}</span>}
                  </span>
                  <span className="text-neutral-600">
                    {fmt(e.trainingSummary, {
                      parts: parts || e.noParts,
                      sheets: training._count.examSheets,
                      criteria: training._count.criteria,
                    })}
                  </span>
                  {training.practicalPart && (
                    <span className="text-neutral-500">
                      {fmt(e.ojtSummary, {
                        count: training.ojtRequiredCount,
                        completeness: training.ojtMinCompletenessPercent,
                        onTime: training.ojtMinOnTimePercent,
                      })}
                    </span>
                  )}
                </span>
                <Link href={`/training/exams/courses/${training.id}`} className="text-sky-700 hover:underline">
                  {e.edit}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
