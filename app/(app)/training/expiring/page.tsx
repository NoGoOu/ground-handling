import Link from "next/link";
import { listExpiring, type ExpiringRow } from "@/lib/data/training";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canViewTraining, trainingVisibleUserIds } from "@/lib/permissions";
import { daysBetween } from "@/lib/qualifications";
import { requireCapability } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { toLocalDate } from "@/lib/time";

const t = messages.training;

function Rows({ rows, today }: { rows: ExpiringRow[]; today: string }) {
  const e = t.expiring;
  if (rows.length === 0) return <p className="text-sm text-neutral-600">{e.empty}</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-600 uppercase">
          <tr>
            {Object.values(e.columns).map((label) => (
              <th key={label} className="px-3 py-2">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row) => {
            const left = daysBetween(today, row.validUntil);
            return (
              <tr key={`${row.person.id}:${row.qualification.id}`}>
                <td className="px-3 py-2 font-medium">{row.person.name}</td>
                <td className="px-3 py-2">
                  <span className="font-mono text-xs">{row.qualification.code}</span> {row.qualification.name}
                </td>
                <td className="px-3 py-2 tabular-nums">{row.validUntil}</td>
                <td className={`px-3 py-2 tabular-nums ${left < 0 ? "text-red-700" : "text-amber-800"}`}>
                  {left < 0 ? fmt(e.daysAgo, { days: -left }) : fmt(e.daysLeft, { days: left })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** The coordinator sees everyone, a team leader the team, an agent their own (CLAUDE.md, 6. mérföldkő). */
export default async function ExpiringPage() {
  const user = await requireCapability(canViewTraining);
  const today = toLocalDate(new Date());
  const { expiryWarningDays } = await getSettings();
  const rows = await listExpiring(trainingVisibleUserIds(user), today, expiryWarningDays);
  const e = t.expiring;
  return (
    <div className="flex flex-col gap-4">
      <Link href="/training" className="self-start text-sm text-sky-700 hover:underline">
        {t.back}
      </Link>
      <h1 className="text-2xl font-bold">{e.title}</h1>
      <p className="max-w-3xl text-sm text-neutral-600">{fmt(e.intro, { days: expiryWarningDays })}</p>
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{e.expiring}</h2>
        <Rows rows={rows.filter((row) => row.status === "EXPIRING")} today={today} />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{e.expired}</h2>
        <Rows rows={rows.filter((row) => row.status === "EXPIRED")} today={today} />
      </section>
    </div>
  );
}
