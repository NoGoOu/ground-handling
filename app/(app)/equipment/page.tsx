import Link from "next/link";
import { DeadlineBadge, EquipmentStatusBadge } from "@/components/badges";
import { listActiveTypes, listEquipment } from "@/lib/data/equipment";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canManageEquipment, canViewEquipment } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { toLocalDate } from "@/lib/time";
import { saveEquipmentAction } from "./actions";
import { EquipmentForm } from "./forms";

// The equipment register (CLAUDE.md, 11. mérföldkő, "Eszközök"): the state,
// the open faults and the nearest deadline of every piece. The technical staff
// keep it; the shift lead sees it.

const e = messages.equipment;

export default async function EquipmentPage(props: PageProps<"/equipment">) {
  const user = await requireCapability(canViewEquipment);
  const { retired } = await props.searchParams;
  const showRetired = retired === "1";
  const today = toLocalDate(new Date());
  const { equipmentWarningDays } = await getSettings();
  const manage = canManageEquipment(user);
  const [rows, types] = await Promise.all([
    listEquipment({ retired: showRetired }, today, equipmentWarningDays),
    manage ? listActiveTypes() : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{e.title}</h1>
      <p className="max-w-3xl text-sm text-neutral-600">{e.intro}</p>
      <div className="flex flex-wrap gap-2">
        {manage && (
          <Link href="/equipment/types" className="btn btn-secondary">
            {e.typesLink}
          </Link>
        )}
        <Link href={showRetired ? "/equipment" : "/equipment?retired=1"} className="btn btn-secondary">
          {showRetired ? e.hideRetired : e.showRetired}
        </Link>
      </div>

      {manage && (
        <details className="rounded-xl border border-neutral-200 bg-white p-4">
          <summary className="cursor-pointer font-semibold">{e.createTitle}</summary>
          <div className="mt-3">
            {types.length === 0 ? (
              <p className="text-sm text-neutral-600">{e.noTypes}</p>
            ) : (
              <EquipmentForm
                action={saveEquipmentAction.bind(null, null)}
                initial={{ typeId: "", identifier: "", plate: "", description: "", note: "" }}
                types={types}
                submitLabel={e.create}
              />
            )}
          </div>
        </details>
      )}

      {rows.length === 0 ? (
        <p className="text-neutral-600">{e.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-600">
              <tr>
                <th className="px-3 py-2 font-medium">{e.identifier}</th>
                <th className="px-3 py-2 font-medium">{e.type}</th>
                <th className="px-3 py-2 font-medium">{e.status}</th>
                <th className="px-3 py-2 text-right font-medium">{e.openFaults}</th>
                <th className="px-3 py-2 font-medium">{e.nearest}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((row) => (
                <tr key={row.id} className={row.status === "RETIRED" ? "text-neutral-400" : ""}>
                  <td className="px-3 py-2">
                    <Link href={`/equipment/${row.id}`} className="font-medium text-sky-700 hover:underline">
                      {row.identifier}
                    </Link>
                    {row.plate && <span className="ml-2 font-mono text-xs text-neutral-500">{row.plate}</span>}
                    {row.description && <span className="block text-xs text-neutral-500">{row.description}</span>}
                  </td>
                  <td className="px-3 py-2">{row.type.name}</td>
                  <td className="px-3 py-2">
                    <EquipmentStatusBadge status={row.status} />
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${row.openFaults > 0 ? "font-semibold text-red-700" : "text-neutral-400"}`}>
                    {row.openFaults}
                  </td>
                  <td className="px-3 py-2">
                    {row.nearest ? (
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="tabular-nums">{row.nearest.date}</span>
                        <span className="text-neutral-500">{row.nearest.name}</span>
                        <DeadlineBadge status={row.nearest.status} />
                      </span>
                    ) : (
                      e.noDeadline
                    )}
                    {row.alerts.length > 0 && <span className="block text-xs font-medium text-orange-700">⚠ {fmt(e.alerts, { n: row.alerts.length })}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
