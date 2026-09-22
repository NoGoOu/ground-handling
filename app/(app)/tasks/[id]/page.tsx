import Link from "next/link";
import { notFound } from "next/navigation";
import { DelayBadge, DeviationBadge, StatusBadge, TypeBadge } from "@/components/badges";
import { TimeStack } from "@/components/time-stack";
import { getTaskView, taskAssignment, type TaskView } from "@/lib/data/tasks";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import {
  canChangeTaskStatus,
  canManageFlights,
  canRecordMilestone,
  canViewTask,
  homePathFor,
} from "@/lib/permissions";
import { requireUser, type CurrentUser } from "@/lib/session";
import { formatTime, formatTimeOnDay, toLocalDate, toLocalDateTimeInput } from "@/lib/time";
import { isRequiredMissing, type Part, type TimelineRow } from "@/lib/turnaround";
import { changeStatus, recordNow, setMilestoneTime } from "./actions";
import { MilestoneActions } from "./milestone-actions";
import { StatusControl } from "./status-control";

const t = messages.task;
const tt = messages.times;

interface ViewContext {
  task: TaskView;
  user: CurrentUser;
  /** Local day of the arrival; times on other days get their date shown. */
  day: string;
  now: Date;
}

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

function RowActions({ ctx, row }: { ctx: ViewContext; row: TimelineRow }) {
  const { task, user } = ctx;
  const record = task.records.get(row.milestone.id);
  const existing = record ? { recordedById: record.recordedBy.id } : null;
  if (!canRecordMilestone(user, taskAssignment(task), row.milestone.part, existing)) return null;
  return (
    <MilestoneActions
      recordNowAction={recordNow.bind(null, task.id, row.milestone.id)}
      setTimeAction={setMilestoneTime.bind(null, task.id, row.milestone.id)}
      hasRecord={!!record}
      defaultTime={toLocalDateTimeInput(record?.actualTime ?? row.planned)}
    />
  );
}

const rowGrid = "sm:grid sm:grid-cols-[2fr_1fr_2fr_1fr] sm:gap-4 lg:grid-cols-[2fr_1fr_2fr_1fr_auto]";

function MilestoneRow({ ctx, row }: { ctx: ViewContext; row: TimelineRow }) {
  const { task, day, now } = ctx;
  const record = task.records.get(row.milestone.id);
  const missing = isRequiredMissing(row, { now, completed: task.status === "COMPLETED" });
  const conflictNames = row.orderConflictIds
    .map((id) => task.milestones.find((m) => m.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <li className={`flex flex-col gap-2 px-4 py-3 sm:items-center ${rowGrid}`}>
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
      <div className="sm:col-span-4 lg:col-span-1 lg:justify-self-end">
        <RowActions ctx={ctx} row={row} />
      </div>
      {(record || conflictNames) && (
        <div className="col-span-full flex flex-col gap-0.5 text-xs text-neutral-500">
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

function PartSection({ ctx, part }: { ctx: ViewContext; part: Part }) {
  const rows = ctx.task.timeline.rows.filter((row) => row.milestone.part === part);
  if (rows.length === 0) return null;
  return (
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <h2 className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 font-semibold">{messages.part[part]}</h2>
      <div className={`hidden px-4 pt-2 text-xs text-neutral-500 uppercase ${rowGrid}`}>
        <span />
        <span>{t.planned}</span>
        <span>{t.actual}</span>
        <span>{t.deviation}</span>
      </div>
      <ul className="divide-y divide-neutral-100">
        {rows.map((row) => (
          <MilestoneRow key={row.milestone.id} ctx={ctx} row={row} />
        ))}
      </ul>
    </section>
  );
}

export default async function TaskPage(props: PageProps<"/tasks/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  const task = await getTaskView(id);
  if (!task || !canViewTask(user, taskAssignment(task))) notFound();

  const ctx: ViewContext = { task, user, day: toLocalDate(task.timeline.arrivalAnchor), now: new Date() };
  const backHref = canManageFlights(user) ? `/flights?date=${toLocalDate(task.flight.sta)}` : homePathFor(user.role);

  return (
    <div className="flex flex-col gap-4">
      <Link href={backHref} className="self-start text-sm text-sky-700 hover:underline">
        {t.back}
      </Link>
      <Header task={task} day={ctx.day} />
      {canChangeTaskStatus(user, taskAssignment(task)) && (
        <section className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="font-semibold">{t.statusTitle}</h2>
          <StatusControl current={task.status} action={changeStatus.bind(null, task.id)} />
        </section>
      )}
      <PartSection ctx={ctx} part="ARRIVAL_PART" />
      <PartSection ctx={ctx} part="DEPARTURE_PART" />
    </div>
  );
}
