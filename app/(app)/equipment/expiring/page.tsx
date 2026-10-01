import Link from "next/link";
import { EquipmentStatusBadge } from "@/components/badges";
import { listExpiringEquipment } from "@/lib/data/equipment";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canViewEquipment } from "@/lib/permissions";
import { daysBetween } from "@/lib/qualifications";
import { requireCapability } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { toLocalDate } from "@/lib/time";

// The expiring deadlines of ground equipment (CLAUDE.md, 11. mérföldkő): two
// groups, the counters that reached their due value with the expired ones
// (approved decision 2).

const e = messages.equipment;
const x = e.expiring;

type Row = Awaited<ReturnType<typeof listExpiringEquipment>>["expired"][number];

function Rows({ rows, today }: { rows: Row[]; today: string }) {
  if (rows.length === 0) return <p className="text-sm text-neutral-600">{x.empty}</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-600 uppercase">
          <tr>
            {Object.values(x.columns).map((label) => (
              <th key={label} className="px-3 py-2">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map(({ equipment, alert }) => {
            const left = alert.kind === "DEADLINE" ? daysBetween(today, alert.date) : null;
            return (
              <tr key={`${equipment.id}:${alert.fieldId}`}>
                <td className="px-3 py-2 font-medium">
                  <Link href={`/equipment/${equipment.id}`} className="text-sky-700 hover:underline">
                    {equipment.identifier}
                  </Link>
                </td>
                <td className="px-3 py-2">{equipment.type.name}</td>
                <td className="px-3 py-2">
                  <EquipmentStatusBadge status={equipment.status} />
                </td>
                <td className="px-3 py-2">{alert.name}</td>
                <td className="px-3 py-2 tabular-nums">
                  {alert.kind === "DEADLINE"
                    ? alert.date
                    : `${fmt(e.counterValue, { value: alert.value, unit: alert.unit ?? "" })} · ${fmt(e.counterDue, { due: alert.due, unit: alert.unit ?? "" })}`}
                </td>
                <td className={`px-3 py-2 tabular-nums ${left === null || left < 0 ? "text-red-700" : "text-amber-800"}`}>
                  {left === null ? x.reached : left < 0 ? fmt(x.daysAgo, { days: -left }) : left === 0 ? x.today : fmt(x.daysLeft, { days: left })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function ExpiringEquipmentPage() {
  await requireCapability(canViewEquipment);
  const today = toLocalDate(new Date());
  const { equipmentWarningDays } = await getSettings();
  const { expiring, expired } = await listExpiringEquipment(today, equipmentWarningDays);
  return (
    <div className="flex flex-col gap-4">
      <Link href="/equipment" className="self-start text-sm text-sky-700 hover:underline">
        {e.back}
      </Link>
      <h1 className="text-2xl font-bold">{x.title}</h1>
      <p className="max-w-3xl text-sm text-neutral-600">{fmt(x.intro, { days: equipmentWarningDays })}</p>
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">
          {x.expiring} ({expiring.length})
        </h2>
        <Rows rows={expiring} today={today} />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">
          {x.expired} ({expired.length})
        </h2>
        <Rows rows={expired} today={today} />
      </section>
    </div>
  );
}
