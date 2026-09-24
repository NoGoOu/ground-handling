import Link from "next/link";
import { listPlans } from "@/lib/data/planning";
import { messages } from "@/lib/messages";
import { canPlan, canViewPlans } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { addDays, formatDateTime, toLocalDate } from "@/lib/time";
import { createPlanAction } from "./actions";
import { CreatePlanForm } from "./create-plan-form";

const t = messages.planning;

export default async function PlanningPage() {
  const user = await requireCapability(canViewPlans);
  const plans = await listPlans();
  const today = toLocalDate(new Date());
  const planner = canPlan(user);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        {planner && (
          <Link href="/planning/settings" className="ml-auto text-sm text-sky-700 hover:underline">
            {t.settingsLink}
          </Link>
        )}
      </div>
      <p className="max-w-3xl text-sm text-neutral-600">{t.intro}</p>

      {planner && (
        <section className="flex max-w-2xl flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="font-semibold">{t.create.title}</h2>
          <CreatePlanForm action={createPlanAction} defaultStart={addDays(today, 1)} defaultEnd={addDays(today, 7)} />
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{t.list.title}</h2>
        {plans.length === 0 ? (
          <p className="text-sm text-neutral-500">{t.list.empty}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-600 uppercase">
                <tr>
                  {Object.values(t.list.columns).map((label) => (
                    <th key={label} className="px-3 py-2">
                      {label}
                    </th>
                  ))}
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {plans.map((plan) => (
                  <tr key={plan.id}>
                    <td className="px-3 py-2 font-medium whitespace-nowrap tabular-nums">
                      {plan.start} – {plan.end}
                    </td>
                    <td className="px-3 py-2">{plan.createdBy.name}</td>
                    <td className="px-3 py-2 whitespace-nowrap tabular-nums">{formatDateTime(plan.createdAt)}</td>
                    <td className="px-3 py-2 tabular-nums">{plan._count.days}</td>
                    <td className="px-3 py-2">
                      <Link href={`/planning/${plan.id}?day=${plan.start}`} className="text-sky-700 hover:underline">
                        {t.list.open}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
