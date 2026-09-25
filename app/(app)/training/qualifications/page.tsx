import Link from "next/link";
import { listQualifications } from "@/lib/data/training";
import { messages } from "@/lib/messages";
import { canManageTraining } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { saveQualification } from "../actions";
import { QualificationForm } from "../forms";

const t = messages.training;

export default async function QualificationsPage() {
  await requireCapability(canManageTraining);
  const qualifications = await listQualifications();
  const q = t.qualifications;
  return (
    <div className="flex flex-col gap-4">
      <Link href="/training" className="self-start text-sm text-sky-700 hover:underline">
        {t.back}
      </Link>
      <h1 className="text-2xl font-bold">{q.title}</h1>
      <p className="max-w-3xl text-sm text-neutral-600">{q.intro}</p>
      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{q.create}</h2>
        <QualificationForm
          action={saveQualification.bind(null, null)}
          initial={{ name: "", code: "", validityMonths: "", active: "on" }}
          submitLabel={q.create}
        />
      </section>
      {qualifications.length === 0 ? (
        <p className="text-neutral-600">{q.empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {qualifications.map((qualification) => (
            <li key={qualification.id} className={`rounded-xl border border-neutral-200 bg-white p-4 ${qualification.active ? "" : "opacity-70"}`}>
              <QualificationForm
                action={saveQualification.bind(null, qualification.id)}
                initial={{
                  name: qualification.name,
                  code: qualification.code,
                  validityMonths: qualification.validityMonths === null ? "" : String(qualification.validityMonths),
                  active: qualification.active ? "on" : "",
                }}
                submitLabel={messages.form.save}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
