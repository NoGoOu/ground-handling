import Link from "next/link";
import { notFound } from "next/navigation";
import { boardRange, hourTicks } from "@/lib/board";
import { getPlan, getPlanDayView, listPositionAgents } from "@/lib/data/planning";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canAssignTasks, canPlan, canViewPlans } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { formatDateTime, formatDayShort, formatTimeOnDay, localDayRange } from "@/lib/time";
import {
  moveItem,
  recalculateDay,
  recalculatePlan,
  savePositionNames,
  saveToDraft,
  takeOverAssignment,
} from "../actions";
import { NamesForm } from "./names-form";
import { PlanBoard } from "./plan-board";
import { RecalculateButton } from "./recalculate-button";
import { SaveDraftButton } from "./save-draft-button";
import { TakeoverButton } from "./takeover-button";

const t = messages.planning;

function hours(minutes: number): string {
  return fmt(t.metrics.hours, { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
}

export default async function PlanPage(props: PageProps<"/planning/[id]">) {
  const user = await requireCapability(canViewPlans);
  const { id } = await props.params;
  const { day: dayValue } = await props.searchParams;
  const plan = await getPlan(id);
  if (!plan) notFound();

  const requested = Array.isArray(dayValue) ? dayValue[0] : dayValue;
  const day = requested && plan.days.includes(requested) ? requested : plan.days[0];
  const view = day ? await getPlanDayView(id, day) : null;
  const planner = canPlan(user);
  const agents = planner ? await listPositionAgents() : [];
  const index = plan.days.indexOf(day);

  const range = view
    ? (() => {
        const window = boardRange(
          localDayRange(day),
          view.lanes.flatMap((lane) => [lane.shift, ...lane.boxes]),
        );
        return { window, range: { startMs: window.start.getTime(), endMs: window.end.getTime() } };
      })()
    : null;

  return (
    <div className="flex flex-col gap-4">
      <Link href="/planning" className="self-start text-sm text-sky-700 hover:underline">
        {t.plan.back}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{fmt(t.plan.title, { start: plan.start, end: plan.end })}</h1>
        {planner && (
          <Link href="/planning/settings" className="ml-auto text-sm text-sky-700 hover:underline">
            {t.settingsLink}
          </Link>
        )}
      </div>
      <p className="text-sm text-neutral-600">
        {fmt(t.plan.meta, { name: plan.createdBy.name, at: formatDateTime(plan.createdAt) })}
      </p>

      {/* Day picker: the days of the plan. */}
      <nav aria-label={t.plan.day} className="flex flex-wrap items-center gap-1.5">
        {index > 0 && (
          <Link href={`/planning/${id}?day=${plan.days[index - 1]}`} className="btn btn-secondary px-2 py-1">
            ‹
          </Link>
        )}
        {plan.days.map((d) => (
          <Link
            key={d}
            href={`/planning/${id}?day=${d}`}
            aria-current={d === day ? "page" : undefined}
            className={`rounded-md border px-2 py-1 text-sm tabular-nums ${
              d === day ? "border-sky-600 bg-sky-600 text-white" : "border-neutral-300 bg-white hover:bg-neutral-50"
            }`}
          >
            {formatDayShort(d)}
          </Link>
        ))}
        {index >= 0 && index < plan.days.length - 1 && (
          <Link href={`/planning/${id}?day=${plan.days[index + 1]}`} className="btn btn-secondary px-2 py-1">
            ›
          </Link>
        )}
      </nav>

      {!view || !range ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-600">{t.plan.notInPlan}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600">
            <span>{fmt(t.plan.calculatedAt, { at: formatDateTime(view.calculatedAt) })}</span>
            {planner && (
              <div className="ml-auto flex flex-wrap gap-2">
                <RecalculateButton
                  action={recalculateDay.bind(null, id, day)}
                  label={t.plan.recalculateDay}
                  confirmText={t.plan.confirmDay}
                />
                <RecalculateButton
                  action={recalculatePlan.bind(null, id)}
                  label={t.plan.recalculatePlan}
                  confirmText={t.plan.confirmPlan}
                />
              </div>
            )}
          </div>
          {view.stale && (
            <p role="status" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              ⚠ {t.plan.stale}
            </p>
          )}
          {view.hasManual && <p className="text-sm text-neutral-600">{t.plan.manual}</p>}

          {view.lanes.length === 0 ? (
            <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-600">{t.plan.empty}</p>
          ) : (
            <>
              <section aria-label={t.metrics.title} className="flex flex-col gap-2">
                <h2 className="font-semibold">{t.metrics.title}</h2>
                <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    [t.metrics.positions, String(view.metrics.positions)],
                    [t.metrics.workHours, hours(view.metrics.workMinutes)],
                    [t.metrics.idle, hours(view.metrics.idleMinutes)],
                    [t.metrics.loadMin, hours(view.metrics.loadMin)],
                    [t.metrics.loadMax, hours(view.metrics.loadMax)],
                    [t.metrics.loadSpread, hours(view.metrics.loadSpread)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-neutral-200 bg-white px-3 py-2">
                      <dt className="text-xs text-neutral-600">{label}</dt>
                      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <p className="text-sm text-neutral-600">{t.plan.legend}</p>
              <PlanBoard
                lanes={view.lanes}
                range={range.range}
                ticks={hourTicks(range.window)}
                day={day}
                canEdit={planner}
                action={moveItem.bind(null, id, day)}
              />

              {canAssignTasks(user) && (
                <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
                  <h2 className="font-semibold">{t.takeover.title}</h2>
                  <p className="text-sm text-neutral-600">{t.takeover.hint}</p>
                  {view.stale && <p className="text-sm text-amber-900">{t.takeover.stale}</p>}
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                    <TakeoverButton
                      action={takeOverAssignment.bind(null, id, day)}
                      label={t.takeover.button}
                      confirmText={t.takeover.confirm}
                    />
                    <TakeoverButton
                      action={takeOverAssignment.bind(null, id, null)}
                      label={t.takeover.planButton}
                      confirmText={t.takeover.planConfirm}
                    />
                  </div>
                </section>
              )}

              {planner && (
                <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
                  <h2 className="font-semibold">{t.names.title}</h2>
                  <p className="text-sm text-neutral-600">{t.names.hint}</p>
                  <NamesForm
                    key={`${day}-${view.calculatedAt.toISOString()}`}
                    positions={view.lanes.map((lane) => ({
                      id: lane.positionId,
                      number: lane.number,
                      userId: lane.userId,
                      shift: `${formatTimeOnDay(lane.shift.start, day)}–${formatTimeOnDay(lane.shift.end, day)}`,
                    }))}
                    agents={agents}
                    action={savePositionNames.bind(null, id, day)}
                  />
                  <p className="border-t border-neutral-200 pt-3 text-sm text-neutral-600">{t.draft.hint}</p>
                  <SaveDraftButton action={saveToDraft.bind(null, id)} />
                </section>
              )}

              <section className="flex flex-col gap-2">
                <h2 className="font-semibold">{t.metrics.perPosition}</h2>
                <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-600 uppercase">
                      <tr>
                        {Object.values(t.metrics.columns).map((label) => (
                          <th key={label} className="px-3 py-2">
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {view.lanes.map((lane) => (
                        <tr key={lane.positionId}>
                          <td className="px-3 py-2 font-medium">
                            {fmt(t.plan.position, { number: lane.number })}
                            {lane.userName && <span className="ml-2 font-normal text-neutral-600">{lane.userName}</span>}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                            {formatTimeOnDay(lane.shift.start, day)}–{formatTimeOnDay(lane.shift.end, day)}
                          </td>
                          <td className="px-3 py-2 tabular-nums">{hours(lane.stats.busyMinutes)}</td>
                          <td className="px-3 py-2 tabular-nums">{hours(lane.stats.shiftMinutes)}</td>
                          <td className="px-3 py-2 tabular-nums">{hours(lane.stats.idleMinutes)}</td>
                          <td className={`px-3 py-2 ${lane.violations.length ? "text-red-700" : "text-neutral-600"}`}>
                            {lane.violations.length
                              ? lane.violations.map((v) => t.plan.violations[v]).join(", ")
                              : t.metrics.ok}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
