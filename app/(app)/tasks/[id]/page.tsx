import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CancelBadges,
  DelayBadge,
  DeviationBadge,
  LateBadge,
  MissingBadge,
  SlotBadge,
  StatusBadge,
  TaskTypeBadge,
  TypeBadge,
} from "@/components/badges";
import { DelayCodeReference } from "@/components/delay-code-reference";
import { EstimateNote } from "@/components/estimate-note";
import { TimeStack } from "@/components/time-stack";
import { flightPartAgents, getTaskView, listFlightTasks, primaryTaskView, taskAssignment, type TaskView } from "@/lib/data/tasks";
import { flightLabel } from "@/lib/flight";
import { dayAnchors } from "@/lib/flight-day";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import {
  canChangeTaskStatus,
  canManageFlights,
  canRecordDelayCodes,
  canRecordMilestone,
  canViewFlightMessages,
  canViewTask,
  homePathFor,
} from "@/lib/permissions";
import { requireUser, type CurrentUser } from "@/lib/session";
import { formatDateTime, formatTime, formatTimeOnDay, toLocalDate, toLocalDateTimeInput } from "@/lib/time";
import { hasPart, isRequiredMissing, type Part, type TimelineRow } from "@/lib/turnaround";
import { delayCodeReference, type DelayCodeReference as DelayReference } from "@/lib/data/delay-documents";
import { listDelayCodes, listDelayRecords, type DelayRecordRow } from "@/lib/data/delays";
import { currentSlots, type FlightSlot } from "@/lib/data/slots";
import { getSettings } from "@/lib/settings";
import { slotDelay, slotLateness } from "@/lib/telex/slot";
import { checkDelays } from "@/lib/telex/checks";
import { warningText } from "@/lib/telex/describe";
import { addDelayCode, addSlotDelayCode, changeStatus, recordNow, removeDelayCode, setMilestoneTime } from "./actions";
import { AddDelayCodeForm, RemoveDelayCodeButton, SlotOfferButton } from "./delay-codes";
import { MilestoneActions } from "./milestone-actions";
import { StatusControl } from "./status-control";
import { TaskTabs } from "./tabs";

const t = messages.task;
const tt = messages.times;

interface ViewContext {
  task: TaskView;
  user: CurrentUser;
  /** Local day of the arrival; times on other days get their date shown. */
  day: string;
  now: Date;
}

/** The slot of the flight's departure (8. mérföldkő), with the planned off-block of the primary task. */
interface SlotInfo {
  slot: FlightSlot;
  plannedOffBlock: Date | null;
  lateness: number | null;
  tolerance: number;
}

function SlotLines({ info }: { info: SlotInfo }) {
  const { slot } = info;
  const s = messages.slot;
  return (
    <div className="flex flex-col gap-0.5 text-sm">
      <p className="text-neutral-700">
        {fmt(s.details, { ctot: formatTime(slot.ctot), taxi: slot.taxiMinutes, target: formatTime(slot.targetOffBlock) })}
        {slot.regulations.length > 0 && <> · {fmt(s.regulations, { list: slot.regulations.join(", ") })}</>}
        {slot.cause && <> · {fmt(s.cause, { reason: slot.cause.reason, code: slot.cause.delayCode ?? "–" })}</>}
      </p>
      <p className="text-xs text-neutral-500">{fmt(s.source, { title: slot.title, time: formatDateTime(slot.receivedAt) })}</p>
      {info.lateness !== null && info.plannedOffBlock && (
        <p role="status" className="text-orange-700">
          ⚠{" "}
          {fmt(s.warning, {
            planned: formatTime(info.plannedOffBlock),
            minutes: info.lateness,
            target: formatTime(slot.targetOffBlock),
            tolerance: info.tolerance,
          })}
        </p>
      )}
    </div>
  );
}

function Header({
  task,
  day,
  siblings,
  slot,
}: {
  task: TaskView;
  day: string;
  /** The flight's other tasks the user may open (5. mérföldkő). */
  siblings: { id: string; isPrimary: boolean; taskType: { name: string; code: string } }[];
  slot: SlotInfo | null;
}) {
  const { flight, timeline } = task;
  // Rule 11: a one-sided flight shows only the part it has.
  const hasArrival = hasPart(timeline.kind, "ARRIVAL_PART");
  const hasDeparture = hasPart(timeline.kind, "DEPARTURE_PART");
  const agents = [
    ...(hasArrival ? [{ label: t.arrivalAgent, agent: task.arrivalAgent }] : []),
    ...(hasDeparture ? [{ label: t.departureAgent, agent: task.effectiveDepartureAgent }] : []),
  ];
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">{flightLabel(flight)}</h1>
        <TaskTypeBadge taskType={task.taskType} />
        <StatusBadge status={task.status} />
        <TypeBadge type={timeline.shape.type} kind={timeline.activeKind ?? timeline.kind} />
        <LateBadge late={task.late} />
        <CancelBadges arrival={flight.arrivalCancelled} departure={flight.departureCancelled} />
        <MissingBadge arrival={flight.arrivalMissing} departure={flight.departureMissing} />
        <DelayBadge minutes={timeline.delayMinutes} />
        {slot && <SlotBadge ctot={slot.slot.ctot} target={slot.slot.targetOffBlock} late={slot.lateness !== null} />}
      </div>
      <p className="text-neutral-600">
        {flight.airline.name} · {fmt(t.stand, { stand: flight.stand ?? messages.flightForm.none })} ·{" "}
        {fmt(t.taskType, { name: task.taskType.name })}
        {task.isPrimary && siblings.length > 0 && ` (${t.primaryMark})`}
      </p>
      {siblings.length > 0 && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-neutral-600">
          {t.otherTasks}
          {siblings.map((sibling) => (
            <Link key={sibling.id} href={`/tasks/${sibling.id}`} className="inline-flex items-center gap-1 hover:underline">
              <TaskTypeBadge taskType={sibling.taskType} />
              {sibling.isPrimary && <span className="text-xs">{t.primaryMark}</span>}
            </Link>
          ))}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {hasArrival && (
          <div className={flight.arrivalCancelled ? "line-through opacity-60" : ""}>
            <TimeStack
              day={day}
              entries={[
                { label: tt.sta, time: flight.sta },
                { label: tt.eta, time: flight.eta },
                { label: tt.ata, time: timeline.effectiveAta, emphasis: true },
              ]}
            />
          </div>
        )}
        {hasDeparture && (
          <div className={flight.departureCancelled ? "line-through opacity-60" : ""}>
            <TimeStack
              day={day}
              entries={[
                { label: tt.std, time: flight.std },
                { label: tt.etd, time: flight.etd },
                { label: tt.atd, time: timeline.effectiveAtd, emphasis: true },
              ]}
            />
          </div>
        )}
        {agents.map(({ label, agent }) => (
          <div key={label} className="flex flex-col">
            <span className="text-xs text-neutral-500">{label}</span>
            <span className={agent ? "font-medium" : "text-neutral-400"}>{agent?.name ?? t.unassigned}</span>
          </div>
        ))}
      </div>
      {slot && <SlotLines info={slot} />}
      <EstimateNote label={tt.eta} info={flight.etaInfo} />
      <EstimateNote label={tt.etd} info={flight.etdInfo} />
      {timeline.shape.type === "LONG" && timeline.shape.breakMinutes !== null && (
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
  // ATA / ATD: the external system's value and the agent's own record side by
  // side; on a task that is not the primary one also the primary task's record,
  // which is the flight's when the system has none (5. mérföldkő).
  return (
    <span className="flex flex-wrap gap-x-3 tabular-nums" title={row.fromFlight ? t.fromFlightNote : undefined}>
      <span>
        <span className="mr-1 text-xs text-neutral-500">{t.system}</span>
        <span className="font-semibold">{row.systemValue ? formatTimeOnDay(row.systemValue, day) : "–"}</span>
      </span>
      {row.fromFlight && (
        <span>
          <span className="mr-1 text-xs text-neutral-500">{t.primaryTask}</span>
          <span className={row.systemValue ? "" : "font-semibold"}>
            {row.primaryValue ? formatTimeOnDay(row.primaryValue, day) : "–"}
          </span>
        </span>
      )}
      <span>
        <span className="mr-1 text-xs text-neutral-500">{t.agentOwn}</span>
        <span className={row.systemValue || row.fromFlight ? "text-neutral-500" : "font-semibold"}>
          {row.recorded ? formatTimeOnDay(row.recorded, day) : "–"}
        </span>
      </span>
    </span>
  );
}

function RowActions({ ctx, row }: { ctx: ViewContext; row: TimelineRow }) {
  const { task, user } = ctx;
  // A cancelled part is not worked ("Késés és törlés").
  if (row.cancelled) return null;
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

const rowGrid = "sm:grid sm:grid-cols-[2fr_1fr_2fr_1fr] sm:gap-4 lg:grid-cols-[2fr_1fr_2fr_1fr_15rem]";

function MilestoneRow({ ctx, row }: { ctx: ViewContext; row: TimelineRow }) {
  const { task, day, now } = ctx;
  const record = task.records.get(row.milestone.id);
  const missing = isRequiredMissing(row, { now, completed: task.status === "COMPLETED" });
  const conflictNames = row.orderConflictIds
    .map((id) => task.milestones.find((m) => m.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <li className={`flex flex-col gap-2 px-4 py-3 sm:items-center ${rowGrid} ${row.cancelled ? "line-through opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{row.milestone.name}</span>
        {!row.milestone.required && <span className="text-xs text-neutral-500">({t.optional})</span>}
        {missing && (
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">{t.missing}</span>
        )}
      </div>
      {/* One line on phones; separate grid cells from sm up. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:contents">
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

/**
 * The delay codes of the flight's departure part (7. mérföldkő): by hand or
 * from the newest departure MVT, with a warning when they do not add up to
 * the delay (rule 7).
 */
function DelayCodes({
  task,
  records,
  codes,
  editable,
  slotOffer,
  reference,
}: {
  task: TaskView;
  /** The airline's own delay code document, or the common table (8. mérföldkő, utómunka). */
  reference: DelayReference;
  records: DelayRecordRow[];
  codes: { code: string; description: string | null; active: boolean }[];
  editable: boolean;
  /** The delay the slot gives, offered while no record has its code (8. mérföldkő). */
  slotOffer: { code: string | null; minutes: number } | null;
}) {
  const d = messages.delayRecords;
  const described = new Map(codes.map((c) => [c.code, c]));
  const delay = task.timeline.delayMinutes;
  const warnings = checkDelays(records, delay);
  const cancelled = task.flight.departureCancelled;
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4">
      <h2 className="font-semibold">{d.title}</h2>
      <p className="text-sm text-neutral-600">{d.hint}</p>
      <DelayCodeReference flightId={task.flight.id} airlineName={task.flight.airline.name} reference={reference} />
      {records.length === 0 ? (
        <p className="text-sm text-neutral-600">{d.empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 text-sm">
          {records.map((record) => (
            <li key={record.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
              <span className="flex flex-col">
                <span>
                  <span className="font-mono font-semibold">{fmt(d.row, { code: record.code, minutes: record.minutes })}</span>
                  {described.get(record.code)?.description && <> · {described.get(record.code)!.description}</>}
                  {!described.has(record.code) && <span className="ml-2 text-orange-700">⚠ {d.unknownCode}</span>}
                </span>
                <span className="text-neutral-500">
                  {fmt(d.recorded, {
                    source: d.source[record.source],
                    name: record.createdBy?.name ?? d.byMessage,
                    time: formatDateTime(record.createdAt),
                  })}
                </span>
              </span>
              {editable && record.source === "MANUAL" && <RemoveDelayCodeButton action={removeDelayCode.bind(null, record.id)} />}
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-neutral-700">
        {fmt(d.total, {
          sum: records.reduce((total, r) => total + r.minutes, 0),
          delay: delay === null ? d.noDelay : fmt(d.delayMinutes, { minutes: delay }),
        })}
      </p>
      {warnings.map((w, i) => (
        <p key={i} className="text-sm text-orange-700">
          ⚠ {warningText(w)}
        </p>
      ))}
      {editable && !cancelled && slotOffer?.code && !records.some((r) => r.code === slotOffer.code) && (
        described.get(slotOffer.code)?.active ? (
          <SlotOfferButton
            label={fmt(messages.slot.offerCode, { code: slotOffer.code, minutes: slotOffer.minutes })}
            action={addSlotDelayCode.bind(null, task.flight.id)}
          />
        ) : (
          <p className="text-sm text-neutral-600">{fmt(messages.slot.offerCodeMissing, { code: slotOffer.code, minutes: slotOffer.minutes })}</p>
        )
      )}
      {cancelled ? (
        <p className="text-sm text-neutral-600">{d.cancelled}</p>
      ) : (
        editable && (
          <AddDelayCodeForm
            action={addDelayCode.bind(null, task.flight.id)}
            codes={codes.filter((c) => c.active).map((c) => ({ code: c.code, description: c.description }))}
          />
        )
      )}
    </section>
  );
}

function PartSection({ ctx, part }: { ctx: ViewContext; part: Part }) {
  const rows = ctx.task.timeline.rows.filter((row) => row.milestone.part === part);
  if (rows.length === 0) return null;
  const { flight } = ctx.task;
  const cancellation = part === "ARRIVAL_PART" ? flight.arrivalCancellation : flight.departureCancellation;
  return (
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <h2 className="flex flex-wrap items-baseline gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-2 font-semibold">
        {messages.part[part]}
        {cancellation && (
          <span className="text-sm font-normal text-neutral-600">
            {cancellation.by && cancellation.at
              ? fmt(messages.cancel.cancelledBy, { name: cancellation.by.name, time: formatTime(cancellation.at) })
              : fmt(messages.cancel.partCancelled, { part: messages.part[part] })}
          </span>
        )}
      </h2>
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
  const siblings = (await listFlightTasks(task.flight.id)).filter(
    (sibling) =>
      sibling.id !== task.id &&
      // The permission rules on the stored agents; a quick turnaround's departure follows the arrival one.
      canViewTask(user, { arrivalAgentId: sibling.arrivalAgentId, departureAgentId: sibling.departureAgentId, type: null }),
  );

  // The day of the list the task sits in: its arrival, or its departure when it has no arrival.
  const day = toLocalDate(dayAnchors(task.timeline).order);
  const ctx: ViewContext = { task, user, day, now: new Date() };
  const backHref = canManageFlights(user) ? `/flights?date=${day}` : homePathFor(user);
  // The messages of the flight (7. mérföldkő), for whoever may see them.
  const agents = await flightPartAgents(task.flight.id);
  const showMessages = canViewFlightMessages(user, [...agents.arrival, ...agents.departure]);
  // The slot (8. mérföldkő): flight-level, so against the primary task's planned off-block (rule 30).
  const slot = task.flight.std ? (await currentSlots([task.flight.id])).get(task.flight.id) : undefined;
  let slotInfo: SlotInfo | null = null;
  if (slot) {
    const primary = task.isPrimary ? task : await primaryTaskView(task.flight.id);
    const plannedOffBlock = (primary ?? task).timeline.departureAnchor;
    const tolerance = (await getSettings()).slotToleranceMinutes;
    slotInfo = { slot, plannedOffBlock, lateness: slotLateness(plannedOffBlock, slot, tolerance), tolerance };
  }
  // Delay codes belong to the flight's departure part.
  const [delayRecords, delayCodes, reference] = task.flight.std
    ? await Promise.all([listDelayRecords(task.flight.id), listDelayCodes(), delayCodeReference(task.flight.airlineId)])
    : [[], [], null];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={backHref} className="text-sm text-sky-700 hover:underline">
          {t.back}
        </Link>
        {canManageFlights(user) && (
          <Link href={`/flights/${task.flight.id}/edit`} className="text-sm text-sky-700 hover:underline">
            {messages.flightForm.delayLink}
          </Link>
        )}
      </div>
      {showMessages && <TaskTabs taskId={task.id} active="task" />}
      <Header task={task} day={ctx.day} siblings={siblings} slot={slotInfo} />
      {canChangeTaskStatus(user, taskAssignment(task)) && (
        <section className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="font-semibold">{t.statusTitle}</h2>
          <StatusControl current={task.status} action={changeStatus.bind(null, task.id)} />
        </section>
      )}
      <PartSection ctx={ctx} part="ARRIVAL_PART" />
      <PartSection ctx={ctx} part="DEPARTURE_PART" />
      {task.flight.std && reference && (
        <DelayCodes
          task={task}
          reference={reference}
          records={delayRecords}
          codes={delayCodes}
          editable={canRecordDelayCodes(user, agents.departure)}
          slotOffer={slot ? slotDelay(slot, task.flight.std) : null}
        />
      )}
    </div>
  );
}
