import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecord, listCourses } from "@/lib/data/training";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canManageTraining } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { formatDateTime } from "@/lib/time";
import { removeRecordFile, updateRecord, uploadRecordFile } from "../../actions";
import { FileUploadForm, RecordForm, RemoveFileButton } from "../../forms";

const t = messages.training;

export default async function RecordPage(props: PageProps<"/training/records/[id]">) {
  await requireCapability(canManageTraining);
  const { id } = await props.params;
  const [record, courses] = await Promise.all([getRecord(id), listCourses()]);
  if (!record) notFound();
  const r = t.records;
  const f = t.files;
  const day = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : "");

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/training/records?person=${record.user.id}`} className="self-start text-sm text-sky-700 hover:underline">
        {t.back}
      </Link>
      <h1 className="text-2xl font-bold">{fmt(r.editTitle, { person: record.user.name, course: record.training.name })}</h1>
      <p className="text-sm text-neutral-600">
        {fmt(r.recordedBy, { name: record.createdBy.name, at: formatDateTime(record.createdAt) })}
        {record.updatedBy && ` · ${fmt(r.updatedBy, { name: record.updatedBy.name, at: formatDateTime(record.updatedAt) })}`}
      </p>

      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <RecordForm
          action={updateRecord.bind(null, record.id)}
          fixedPerson={record.user.name}
          people={[]}
          courses={courses.map((c) => ({ id: c.id, name: c.name, hasExam: c.hasExam, givesQualification: !!c.qualification }))}
          initial={{
            userId: record.user.id,
            trainingId: record.trainingId,
            completedOn: day(record.completedOn),
            examPercent: record.examPercent === null ? "" : String(record.examPercent),
            passed: record.passed ? "on" : "",
            validUntil: day(record.validUntil),
            validUntilManual: record.validUntilManual ? "on" : "",
            note: record.note ?? "",
          }}
          submitLabel={messages.form.save}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{f.title}</h2>
        {record.files.length === 0 ? (
          <p className="text-sm text-neutral-600">{f.empty}</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {record.files.map((file) => (
              <li key={file.id} className="flex flex-wrap items-center gap-3">
                {file.storageKey ? (
                  <a href={`/api/training-files/${file.id}`} className="font-medium text-sky-700 hover:underline">
                    {file.fileName}
                  </a>
                ) : (
                  <span className="text-neutral-500 line-through">{file.fileName}</span>
                )}
                <span className="text-xs text-neutral-500">
                  {fmt(f.uploaded, { name: file.uploadedBy.name, at: formatDateTime(file.uploadedAt) })}
                  {file.removedAt &&
                    file.removedBy &&
                    ` · ${fmt(f.removed, { name: file.removedBy.name, at: formatDateTime(file.removedAt) })}`}
                </span>
                {file.storageKey && <RemoveFileButton action={removeRecordFile.bind(null, file.id)} />}
              </li>
            ))}
          </ul>
        )}
        <FileUploadForm action={uploadRecordFile.bind(null, record.id)} />
      </section>
      <p className="text-sm text-neutral-500">{r.noDelete}</p>
    </div>
  );
}
