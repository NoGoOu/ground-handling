import Link from "next/link";
import { QualificationStatusBadge } from "@/components/badges";
import { qualificationTable } from "@/lib/data/training";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canViewTraining, trainingVisibleUserIds } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { toLocalDate } from "@/lib/time";

const t = messages.training;

/**
 * The team table (CLAUDE.md, 6. mérföldkő): person × qualification with the
 * status colours of today. A team leader sees the team, the coordinator and the
 * admin everyone; the "Emberek" list leads to each person.
 */
export default async function TeamPage() {
  const user = await requireCapability(canViewTraining);
  const { expiryWarningDays } = await getSettings();
  const today = toLocalDate(new Date());
  const visible = trainingVisibleUserIds(user);
  const { qualifications, people } = await qualificationTable(visible, today, expiryWarningDays);
  const shown = people.filter(({ person }) => person.active);
  const tm = t.team;
  return (
    <div className="flex flex-col gap-4">
      <Link href="/training" className="self-start text-sm text-sky-700 hover:underline">
        {t.back}
      </Link>
      <h1 className="text-2xl font-bold">{tm.title}</h1>
      <p className="max-w-3xl text-sm text-neutral-600">{tm.intro}</p>
      {qualifications.length === 0 ? (
        <p className="text-neutral-600">{tm.noQualifications}</p>
      ) : shown.length === 0 ? (
        <p className="text-neutral-600">{tm.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-600">
              <tr>
                <th className="px-3 py-2 uppercase">{tm.person}</th>
                <th className="px-3 py-2 uppercase">{t.people.team}</th>
                {qualifications.map((q) => (
                  <th key={q.id} className="px-3 py-2 font-mono" title={q.name}>
                    {q.code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {shown.map(({ person, qualifications: statuses }) => (
                <tr key={person.id}>
                  <td className="px-3 py-2 font-medium">
                    <Link href={`/training/people/${person.id}`} className="text-sky-700 hover:underline">
                      {person.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-neutral-600">{person.team ?? t.people.noTeam}</td>
                  {qualifications.map((q) => {
                    const status = statuses.get(q.id);
                    const title = status?.validUntil ? fmt(t.validUntil, { day: status.validUntil }) : undefined;
                    return (
                      <td key={q.id} className="px-3 py-2" title={title}>
                        <QualificationStatusBadge status={status?.status ?? "MISSING"} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
