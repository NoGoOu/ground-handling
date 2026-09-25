import Link from "next/link";
import { QualificationStatusBadge } from "@/components/badges";
import { listRecords, qualificationTable } from "@/lib/data/training";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";

const t = messages.training;
const day = (date: Date) => date.toISOString().slice(0, 10);

/**
 * One person's qualifications and training records (CLAUDE.md, 6. mérföldkő):
 * the agent's own page and the person page share it. Big type, one column on
 * a phone. The caller has checked that the viewer may see this person.
 */
export async function PersonTraining({
  userId,
  today,
  warningDays,
  canEdit,
}: {
  userId: string;
  today: string;
  warningDays: number;
  /** The coordinator gets links to correct the records. */
  canEdit: boolean;
}) {
  const [{ qualifications, people }, records] = await Promise.all([
    qualificationTable([userId], today, warningDays),
    listRecords([userId]),
  ]);
  const statuses = people[0]?.qualifications ?? new Map();
  const p = t.person;
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{p.qualifications}</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {qualifications.map((qualification) => {
            const status = statuses.get(qualification.id);
            return (
              <li key={qualification.id} className="flex flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm text-neutral-600">{qualification.code}</span>
                  <span className="text-lg font-semibold">{qualification.name}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <QualificationStatusBadge status={status?.status ?? "MISSING"} />
                  {status && status.status !== "MISSING" && (
                    <span className="text-neutral-600">
                      {status.validUntil ? fmt(t.validUntil, { day: status.validUntil }) : t.noExpiry}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">{p.records}</h2>
          {canEdit && (
            <Link href={`/training/records?person=${userId}`} className="text-sm text-sky-700 hover:underline">
              {p.editRecords}
            </Link>
          )}
        </div>
        {records.length === 0 ? (
          <p className="text-neutral-600">{p.noRecords}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {records.map((record) => (
              <li key={record.id} className="flex flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{record.training.name}</span>
                  {record.training.qualification && (
                    <span className="font-mono text-xs text-neutral-500">{record.training.qualification.code}</span>
                  )}
                  <span className={`text-sm ${record.passed ? "text-emerald-700" : "text-red-700"}`}>
                    {record.passed ? t.records.passedYes : t.records.passedNo}
                    {record.examPercent !== null && ` (${record.examPercent}%)`}
                  </span>
                  {canEdit && (
                    <Link href={`/training/records/${record.id}`} className="ml-auto text-sm text-sky-700 hover:underline">
                      {t.records.open}
                    </Link>
                  )}
                </div>
                <div className="text-sm text-neutral-600 tabular-nums">
                  {t.records.completedOn}: {day(record.completedOn)}
                  {record.training.qualification &&
                    ` · ${record.validUntil ? fmt(t.validUntil, { day: day(record.validUntil) }) : t.noExpiry}`}
                </div>
                {record.note && <p className="text-sm text-neutral-700">{record.note}</p>}
                {record.files.some((file) => file.storageKey) && (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-neutral-500">{p.files}</span>
                    {record.files
                      .filter((file) => file.storageKey)
                      .map((file) => (
                        <a key={file.id} href={`/api/training-files/${file.id}`} className="text-sky-700 hover:underline">
                          {file.fileName}
                        </a>
                      ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
