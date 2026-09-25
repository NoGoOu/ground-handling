import Link from "next/link";
import { listCourses, listRecords, listTrainingPeople } from "@/lib/data/training";
import { messages } from "@/lib/messages";
import { canManageTraining } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { toLocalDate } from "@/lib/time";
import { createRecord } from "../actions";
import { RecordForm } from "../forms";

const t = messages.training;

export default async function RecordsPage(props: PageProps<"/training/records">) {
  await requireCapability(canManageTraining);
  const { person } = await props.searchParams;
  const personId = typeof person === "string" && person ? person : null;
  const [people, courses, records] = await Promise.all([
    listTrainingPeople(null),
    listCourses(),
    listRecords(personId ? [personId] : null),
  ]);
  const r = t.records;
  return (
    <div className="flex flex-col gap-4">
      <Link href="/training" className="self-start text-sm text-sky-700 hover:underline">
        {t.back}
      </Link>
      <h1 className="text-2xl font-bold">{r.title}</h1>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{r.create}</h2>
        <RecordForm
          action={createRecord}
          initial={{
            userId: personId ?? "",
            trainingId: "",
            completedOn: toLocalDate(new Date()),
            examPercent: "",
            passed: "",
            validUntil: "",
            validUntilManual: "",
            note: "",
          }}
          people={people.filter((p) => p.active)}
          courses={courses.map((c) => ({ id: c.id, name: c.name, hasExam: c.hasExam, givesQualification: !!c.qualification }))}
          submitLabel={r.create}
        />
      </section>

      <form className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">{r.filterPerson}</span>
          <select name="person" defaultValue={personId ?? ""} className="input w-auto">
            <option value="">{r.filterAll}</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-secondary">
          {r.filter}
        </button>
      </form>

      {records.length === 0 ? (
        <p className="text-neutral-600">{r.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-600 uppercase">
              <tr>
                <th className="px-3 py-2">{r.person}</th>
                <th className="px-3 py-2">{r.course}</th>
                <th className="px-3 py-2">{r.completedOn}</th>
                <th className="px-3 py-2">{r.result}</th>
                <th className="px-3 py-2">{r.validUntil}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="px-3 py-2 font-medium">{record.user.name}</td>
                  <td className="px-3 py-2">
                    {record.training.name}
                    {record.training.qualification && (
                      <span className="ml-1 font-mono text-xs text-neutral-500">{record.training.qualification.code}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{record.completedOn.toISOString().slice(0, 10)}</td>
                  <td className={`px-3 py-2 ${record.passed ? "text-emerald-700" : "text-red-700"}`}>
                    {record.passed ? r.passedYes : r.passedNo}
                    {record.examPercent !== null && ` (${record.examPercent}%)`}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {!record.training.qualification
                      ? t.none
                      : record.validUntil
                        ? record.validUntil.toISOString().slice(0, 10)
                        : t.noExpiry}
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/training/records/${record.id}`} className="text-sky-700 hover:underline">
                      {r.open}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-sm text-neutral-500">{r.noDelete}</p>
    </div>
  );
}
