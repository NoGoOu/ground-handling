import Link from "next/link";
import { notFound } from "next/navigation";
import { getExamTraining } from "@/lib/data/exams";
import { DEFAULT_OJT_REQUIREMENT } from "@/lib/exams/defaults";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canEditExams } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { addCriterionAction, moveCriterionAction, saveCriterionAction, savePartsAction } from "../../actions";
import { CriterionForm, PartsForm, RowButton } from "../../forms";

// One training's parts, OJT requirement and practical criteria (CLAUDE.md,
// 10. mérföldkő, "A képzés részei" and "Gyakorlati vizsga").

const e = messages.exams;
const c = e.course;

export default async function ExamCoursePage(props: PageProps<"/training/exams/courses/[id]">) {
  await requireCapability(canEditExams);
  const { id } = await props.params;
  const training = await getExamTraining(id);
  if (!training) notFound();
  const canTheory = training.hasExam && training.passPercent !== null;

  return (
    <div className="flex flex-col gap-4">
      <Link href="/training/exams" className="self-start text-sm text-sky-700 hover:underline">
        {e.back}
      </Link>
      <h1 className="text-2xl font-bold">{fmt(c.title, { name: training.name })}</h1>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{c.partsTitle}</h2>
        <p className="max-w-3xl text-sm text-neutral-600">{c.partsHint}</p>
        <p className="text-sm text-neutral-700">{canTheory ? fmt(c.passMark, { pass: training.passPercent! }) : c.noExam}</p>
        <p className="max-w-3xl text-xs text-neutral-500">
          {fmt(c.ojtHint, {
            count: DEFAULT_OJT_REQUIREMENT.requiredCount,
            completeness: DEFAULT_OJT_REQUIREMENT.minCompletenessPercent,
            onTime: DEFAULT_OJT_REQUIREMENT.minOnTimePercent,
          })}
        </p>
        <PartsForm
          action={savePartsAction.bind(null, training.id)}
          canTheory={canTheory}
          initial={{
            theoryPart: training.theoryPart ? "on" : "",
            practicalPart: training.practicalPart ? "on" : "",
            ojtRequiredCount: String(training.ojtRequiredCount),
            ojtMinCompletenessPercent: String(training.ojtMinCompletenessPercent),
            ojtMinOnTimePercent: String(training.ojtMinOnTimePercent),
          }}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{c.criteriaTitle}</h2>
        <p className="max-w-3xl text-sm text-neutral-600">{c.criteriaHint}</p>
        {training.criteria.length === 0 ? (
          <p className="text-sm text-neutral-600">{c.noCriteria}</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {training.criteria.map((criterion, index) => (
              <li key={criterion.id} className={`flex flex-wrap items-center gap-2 ${criterion.active ? "" : "opacity-60"}`}>
                <span className="w-6 text-right text-sm text-neutral-500">{index + 1}.</span>
                <CriterionForm
                  action={saveCriterionAction.bind(null, criterion.id)}
                  initial={{ text: criterion.text, active: criterion.active ? "on" : "", knockOut: criterion.knockOut ? "on" : "" }}
                  submitLabel={messages.form.save}
                  withActive
                />
                {index > 0 && <RowButton action={moveCriterionAction.bind(null, criterion.id, -1)} label={e.moveUp} />}
                {index < training.criteria.length - 1 && <RowButton action={moveCriterionAction.bind(null, criterion.id, 1)} label={e.moveDown} />}
              </li>
            ))}
          </ol>
        )}
        <div className="flex flex-col gap-1 border-t border-neutral-100 pt-3">
          <span className="text-sm font-medium text-neutral-700">{c.addCriterion}</span>
          <CriterionForm action={addCriterionAction.bind(null, training.id)} initial={{ text: "", active: "on", knockOut: "" }} submitLabel={c.addCriterion} withActive={false} />
        </div>
      </section>
    </div>
  );
}
