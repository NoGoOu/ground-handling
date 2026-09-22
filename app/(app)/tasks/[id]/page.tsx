import Link from "next/link";
import { notFound } from "next/navigation";
import { DelayBadge, DeviationBadge, StatusBadge, TypeBadge } from "@/components/badges";
import { TimeStack } from "@/components/time-stack";
import { getTaskView, type TaskView } from "@/lib/data/tasks";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canManageFlights, canViewTask, homePathFor } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { formatTime, formatTimeOnDay, toLocalDate } from "@/lib/time";
import { isRequiredMissing, type Part, type TimelineRow } from "@/lib/turnaround";

const t = messages.task;
const tt = messages.times;

function Header({ task, day }: { task: TaskView; day: string }) {
  const { flight, timeline } = task;
  const agents = [
    { label: t.arrivalAgent, agent: task.arrivalAgent },
    { label: t.departureAgent, agent: task.effectiveDepartureAgent },
  ];
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">
          {flight.inboundFlightNumber} / {flight.outboundFlightNumber}
        </h1>
        <StatusBadge status={task.status} />
        <TypeBadge type={timeline.shape.type} />
        <DelayBadge minutes={timeline.delayMinutes} />
      </div>
      <p className="text-neutral-600">
        {flight.airline.name} · {fmt(t.stand, { stand: flight.stand })}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TimeStack
          day={day}
          entries={[
            { label: tt.sta, time: flight.sta },
            { label: tt.eta, time: flight.eta },
            { label: tt.ata, time: timeline.effectiveAta, emphasis: true },
          ]}
        />
        <TimeStack
          day={day}
          entries={[
            { label: tt.std, time: flight.std },
            { label: tt.etd, time: flight.etd },
            { label: tt.atd, time: timeline.effectiveAtd, emphasis: true },
          ]}
        />
        {agents.map(({ label, agent }) => (
          <div key={label} className="flex flex-col">
            <span className="text-xs text-neutral-500">{label}</span>
            <span className={agent ? "font-medium" : "text-neutral-400"}>{agent?.name ?? t.unassigned}</span>
          </div>
        ))}
      </div>
      {timeline.shape.type === "LONG" && (
        <p className="text-sm text-neutral-600">{fmt(t.breakInfo, { minutes: timeline.shape.breakMinutes })}</p>
      )}
      {task.frozen && <p className="text-sm text-neutral-600">{t.frozenNote}</p>}
    </section>
  );
}

function ActualTimes({ row, day }: { row: TimelineRow; day: string }) {
  const isSystemRow = row.milestone.code === "ATA" || row.milestone.code === "ATD";
  if (!isSystemRow) {
    return <span className="font-semibold tabular-nums">{row.actual ? formatTimeOnDay(row.actual, day) : "–"}</span>;
  }
  // ATA / ATD: the external system's value and the agent's own record side by side.
  return (
    <span className="flex flex-wrap gap-x-3 tabular-nums">
      <span>
        <span className="mr-1 text-xs text-neutral-500">{t.system}</span>
        <span className="font-semibold">{row.systemValue ? formatTimeOnDay(row.systemValue, day) : "–"}</span>
      </span>
      <span>
        <span className="mr-1 text-xs text-neutral-500">{t.agentOwn}</span>
        <span className={row.systemValue ? "" : "font-semibold"}>
          {row.recorded ? formatTimeOnDay(row.recorded, day) : "–"}
        </span>
      </span>
    </span>
  );
}

function MilestoneRow({ task, row, day, now }: { task: TaskView; row: TimelineRow; day: string; now: Date }) {
  const record = task.records.get(row.milestone.id);
  const missing = isRequiredMissing(row, { now, completed: task.status === "COMPLETED" });
  const conflictNames = row.orderConflictIds
    .map((id) => task.milestones.find((m) => m.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:grid sm:grid-cols-[2fr_1fr_2fr_1fr] sm:items-center sm:gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{row.milestone.name}</span>
        {!row.milestone.required && <span className="text-xs text-neutral-500">({t.optional})</span>}
        {missing && (
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">{t.missing}</span>
        )}
      </div>
      <div className="text-sm tabular-nums">
        <span className="mr-1 text-xs text-neutral-500 sm:hidden">{t.planned}</span>
        {formatTimeOnDay(row.planned, day)}
      </div>
      <div className="text-sm">
        <span className="mr-1 text-xs text-neutral-500 sm:hidden">{t.actual}</span>
        <ActualTimes row={row} day={day} />
      </div>
      <div>
        {row.deviationMinutes !== null && row.deviationLevel && (
          <DeviationBadge minutes={row.deviationMinutes} level={row.deviationLevel} />
        )}
      </div>
      {(record || conflictNames) && (
        <div className="flex flex-col gap-0.5 text-xs text-neutral-500 sm:col-span-4">
          {record && (
            <span>
              {fmt(t.recordedBy, { name: record.recordedBy.name, time: formatTime(record.recordedAt) })}
              {record.updatedBy && record.updatedAt && (
                <> · {fmt(t.updatedBy, { name: record.updatedBy.name, time: formatTime(record.updatedAt) })}</>
              )}
            </span>
          )}
          {conflictNames && (
            <span className="font-medium text-orange-700">⚠ {fmt(t.orderWarning, { names: conflictNames })}</span>
          )}
        </div>
      )}
    </li>
  );
}

function PartSection({ task, part, day, now }: { task: TaskView; part: Part; day: string; now: Date }) {
  const rows = task.timeline.rows.filter((row) => row.milestone.part === part);
  if (rows.length === 0) return null;
  return (
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <h2 className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 font-semibold">{messages.part[part]}</h2>
      <div className="hidden px-4 pt-2 text-xs text-neutral-500 uppercase sm:grid sm:grid-cols-[2fr_1fr_2fr_1fr] sm:gap-4">
        <span />
        <span>{t.planned}</span>
        <span>{t.actual}</span>
        <span>{t.deviation}</span>
      </div>
      <ul className="divide-y divide-neutral-100">
        {rows.map((row) => (
          <MilestoneRow key={row.milestone.id} task={task} row={row} day={day} now={now} />
        ))}
      </ul>
    </section>
  );
}

export default async function TaskPage(props: PageProps<"/tasks/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  const task = await getTaskView(id);
  const assignment = task && {
    arrivalAgentId: task.arrivalAgent?.id ?? null,
    departureAgentId: task.departureAgent?.id ?? null,
    type: task.timeline.shape.type,
  };
  if (!task || !assignment || !canViewTask(user, assignment)) notFound();

  const day = toLocalDate(task.timeline.arrivalAnchor);
  const now = new Date();
  const backHref = canManageFlights(user) ? `/flights?date=${toLocalDate(task.flight.sta)}` : homePathFor(user.role);

  return (
    <div className="flex flex-col gap-4">
      <Link href={backHref} className="self-start text-sm text-sky-700 hover:underline">
        {t.back}
      </Link>
      <Header task={task} day={day} />
      <PartSection task={task} part="ARRIVAL_PART" day={day} now={now} />
      <PartSection task={task} part="DEPARTURE_PART" day={day} now={now} />
    </div>
  );
}
