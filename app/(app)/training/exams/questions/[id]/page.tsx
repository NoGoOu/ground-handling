import Link from "next/link";
import { notFound } from "next/navigation";
import { FormMessage } from "@/components/form-field";
import { getQuestion } from "@/lib/data/exams";
import { messages } from "@/lib/messages";
import { canEditExams } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { saveQuestionAction } from "../../actions";
import { QuestionForm } from "../../forms";
import { questionValues } from "../../values";

const q = messages.exams.questions;

export default async function QuestionPage(props: PageProps<"/training/exams/questions/[id]">) {
  await requireCapability(canEditExams);
  const { id } = await props.params;
  const { created } = await props.searchParams;
  const question = await getQuestion(id);
  if (!question) notFound();
  return (
    <div className="flex flex-col gap-4">
      <Link href="/training/exams/questions" className="self-start text-sm text-sky-700 hover:underline">
        {q.title}
      </Link>
      <h1 className="text-2xl font-bold">{q.title}</h1>
      {created && <FormMessage notice={q.created} />}
      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <QuestionForm action={saveQuestionAction.bind(null, id)} initial={questionValues(question)} submitLabel={messages.form.save} />
      </section>
    </div>
  );
}
