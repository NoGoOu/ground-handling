import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TaskTypeBadge } from "@/components/badges";
import { InfographicView } from "@/components/infographic";
import { MessageContent } from "@/components/message-content";
import { listDelayRecords } from "@/lib/data/delays";
import { listFlightMessages, versionGroups, type FlightMessage } from "@/lib/data/messages";
import { currentSlots } from "@/lib/data/slots";
import { flightPartAgents, getTaskView, taskAssignment } from "@/lib/data/tasks";
import { prisma } from "@/lib/db";
import { flightLabel } from "@/lib/flight";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canSendPartMessage, canViewFlightMessages, canViewTask } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { warningText } from "@/lib/telex/describe";
import { buildInfographic, type CurrentMessage } from "@/lib/telex/infographic";
import type { Part } from "@/lib/telex/match";
import { slotDelay } from "@/lib/telex/slot";
import { formatDateTime, toLocalDateTimeInput } from "@/lib/time";
import { TaskTabs } from "../tabs";
import { previewMvt, sendMvt, type MvtKind, type MvtValues } from "./actions";
import { CorrectionToggle, MvtPanel } from "./mvt-panel";

// The "Üzenetek" tab (CLAUDE.md, 7. and 8. mérföldkő): the messages of the
// task's flight per part, with their versions, raw and parsed, and their
// warnings; the MVTs we send and their corrections. The shift lead and the
// agent see it by the message viewing permission.

const t = messages.flightMessages;

function sourceText(message: FlightMessage): string {
  const s = messages.inbox.source;
  if (message.source === "API") return fmt(s.API, { key: message.apiKey?.name ?? "–" });
  if (message.source === "MANUAL") return fmt(s.MANUAL, { name: message.createdBy?.name ?? "–" });
  return message.createdBy ? fmt(messages.outbound.sentBy, { name: message.createdBy.name }) : s.GENERATED;
}

function kindLabel(message: FlightMessage): string {
  const kinds: Record<string, string> = t.kinds;
  return message.kind && kinds[message.kind] ? `${message.type} · ${kinds[message.kind]}` : message.type;
}

const localInput = (iso: string | undefined) => (iso ? toLocalDateTimeInput(new Date(iso)) : "");

/** The values of an MVT we sent, to start its correction from. */
function valuesOf(message: FlightMessage): MvtValues {
  const parsed = message.parsedMessage;
  const times = message.stored.times ?? {};
  const mvt = parsed.type === "MVT" ? parsed.data : null;
  return {
    registration: parsed.header?.registration ?? "",
    airborne: localInput(times.airborne),
    estimatedArrival: localInput(times.estimatedArrival),
    destination: mvt?.estimatedArrival?.destination ?? "",
    touchdown: localInput(times.touchdown),
    si: mvt?.si.join(" ") ?? "",
  };
}

function MessageCard({ message, correction }: { message: FlightMessage; correction?: ReactNode }) {
  return (
    <article className="flex flex-col gap-2">
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-mono font-semibold">{kindLabel(message)}</span>
        <span className="rounded bg-neutral-100 px-1.5 text-xs text-neutral-700">
          {message.direction === "INBOUND" ? t.inbound : t.outbound}
        </span>
        {message.correction && <span className="rounded bg-amber-100 px-1.5 text-xs text-amber-900">{t.correction}</span>}
        <span
          className={
            message.current
              ? "rounded bg-emerald-100 px-1.5 text-xs text-emerald-800"
              : "rounded bg-neutral-100 px-1.5 text-xs text-neutral-500"
          }
        >
          {message.current ? t.current : t.superseded}
        </span>
        <span className="text-neutral-500">
          {formatDateTime(message.receivedAt)} · {sourceText(message)}
        </span>
      </p>
      {message.warnings.map((warning, i) => (
        <p key={i} className="text-sm text-orange-700">
          ⚠ {warningText(warning)}
        </p>
      ))}
      <MessageContent message={message} />
      {message.deliveries.length > 0 && (
        <ul className="flex flex-col gap-0.5 text-sm">
          {message.deliveries.map((d) => (
            <li key={d.id} className={d.status === "SENT" ? "text-emerald-700" : d.status === "FAILED" ? "text-red-700" : "text-orange-700"}>
              {fmt(messages.outbound.delivery, {
                recipient: d.recipient,
                channel: d.channel,
                status: d.error ? `${messages.outbound.status[d.status]} (${d.error})` : messages.outbound.status[d.status],
              })}
            </li>
          ))}
        </ul>
      )}
      <details>
        <summary className="cursor-pointer text-sm text-neutral-600">{t.raw}</summary>
        <pre className="mt-1 overflow-x-auto rounded bg-neutral-50 p-2 font-mono text-xs">
          {message.envelope ? `${message.envelope}\n${message.rawText}` : message.rawText}
        </pre>
      </details>
      {correction}
    </article>
  );
}

function PartMessages({
  rows,
  part,
  correctionFor,
  children,
}: {
  rows: FlightMessage[];
  part: Part;
  /** The correction of an MVT we sent, when the user may send on this part. */
  correctionFor?: (message: FlightMessage) => ReactNode;
  children?: ReactNode;
}) {
  const groups = versionGroups(rows, part);
  // The infographic sums up the part's current messages, inbound or ours.
  const current = rows
    .filter((row) => row.part === part && row.current)
    .map((row): CurrentMessage => ({ ...row.parsedMessage, id: row.id, receivedAt: row.receivedAt, warnings: row.warnings }));
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
      <h2 className="font-semibold">{messages.part[part]}</h2>
      <h3 className="text-sm font-semibold text-neutral-700">{messages.infographic.title}</h3>
      <InfographicView data={buildInfographic(current)} />
      {groups.length === 0 ? (
        <p className="text-sm text-neutral-600">{t.empty}</p>
      ) : (
        groups.map(({ key, versions: [latest, ...older] }) => (
          <div key={key} className="flex flex-col gap-2 border-t border-neutral-100 pt-3 first:border-t-0 first:pt-0">
            <MessageCard message={latest} correction={correctionFor?.(latest)} />
            {older.length > 0 && (
              <details className="ml-3 border-l-2 border-neutral-100 pl-3">
                <summary className="cursor-pointer text-sm text-neutral-600">
                  {fmt(t.olderVersions, { count: older.length })}
                </summary>
                <div className="mt-2 flex flex-col gap-3">
                  {older.map((message) => (
                    <MessageCard key={message.id} message={message} />
                  ))}
                </div>
              </details>
            )}
          </div>
        ))
      )}
      {children}
    </section>
  );
}

export default async function TaskMessagesPage(props: PageProps<"/tasks/[id]/messages">) {
  const user = await requireUser();
  const { id } = await props.params;
  const task = await getTaskView(id);
  if (!task || !canViewTask(user, taskAssignment(task))) notFound();
  const agents = await flightPartAgents(task.flight.id);
  if (!canViewFlightMessages(user, [...agents.arrival, ...agents.departure])) notFound();
  const rows = await listFlightMessages(task.flight.id);
  const flight = await prisma.flight.findUniqueOrThrow({
    where: { id: task.flight.id },
    select: { arrivalRegistration: true, departureRegistration: true, destination: true },
  });

  // The MVTs we send: whoever may send on the part (7. and 8. mérföldkő).
  const canSend: Record<Part, boolean> = {
    ARRIVAL_PART: !!task.flight.sta && !task.flight.arrivalCancelled && canSendPartMessage(user, agents.arrival),
    DEPARTURE_PART: !!task.flight.std && !task.flight.departureCancelled && canSendPartMessage(user, agents.departure),
  };
  const kindOf: Record<Part, MvtKind> = { ARRIVAL_PART: "AA", DEPARTURE_PART: "AD" };
  // The DL line comes from the delay records; the slot's delay is offered there (8. mérföldkő).
  const slot = canSend.DEPARTURE_PART ? (await currentSlots([task.flight.id])).get(task.flight.id) : undefined;
  const slotOffer = slot ? slotDelay(slot, task.flight.std) : null;
  const slotHint =
    slotOffer?.code && !(await listDelayRecords(task.flight.id)).some((r) => r.code === slotOffer.code)
      ? fmt(messages.slot.offerMvt, { code: slotOffer.code, minutes: slotOffer.minutes })
      : null;
  const actual: Record<Part, string | null> = {
    ARRIVAL_PART: task.timeline.effectiveAta ? formatDateTime(task.timeline.effectiveAta) : null,
    DEPARTURE_PART: task.timeline.effectiveAtd ? formatDateTime(task.timeline.effectiveAtd) : null,
  };
  const panel = (part: Part, correction: boolean, initial: MvtValues) => ({
    kind: kindOf[part],
    previewAction: previewMvt.bind(null, task.id, kindOf[part], correction),
    sendAction: sendMvt.bind(null, task.id, kindOf[part]),
    initial,
    actual: actual[part],
  });
  const correctionFor = (part: Part) =>
    function correction(message: FlightMessage) {
      const ours = message.direction === "OUTBOUND" && message.type === "MVT" && message.current;
      return ours && message.kind === kindOf[part] ? <CorrectionToggle {...panel(part, true, valuesOf(message))} /> : null;
    };
  const parts: Part[] = [
    ...(task.flight.sta ? (["ARRIVAL_PART"] as const) : []),
    ...(task.flight.std ? (["DEPARTURE_PART"] as const) : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">{flightLabel(task.flight)}</h1>
        <TaskTypeBadge taskType={task.taskType} />
      </div>
      <TaskTabs taskId={task.id} active="messages" />
      <p className="max-w-3xl text-sm text-neutral-600">{t.hint}</p>
      {parts.map((part) => (
        <PartMessages key={part} rows={rows} part={part} correctionFor={canSend[part] ? correctionFor(part) : undefined}>
          {canSend[part] && (
            <div className="flex flex-col gap-2 border-t border-neutral-200 pt-3">
              <h3 className="font-semibold">{part === "DEPARTURE_PART" ? messages.outbound.title : messages.outbound.arrivalTitle}</h3>
              <p className="text-sm text-neutral-600">{part === "DEPARTURE_PART" ? messages.outbound.hint : messages.outbound.arrivalHint}</p>
              {part === "DEPARTURE_PART" && slotHint && <p className="text-sm text-sky-900">{slotHint}</p>}
              <MvtPanel
                {...panel(part, false, {
                  registration: (part === "DEPARTURE_PART" ? flight.departureRegistration : flight.arrivalRegistration) ?? "",
                  airborne: "",
                  estimatedArrival: "",
                  destination: flight.destination ?? "",
                  touchdown: "",
                  si: "",
                })}
              />
            </div>
          )}
        </PartMessages>
      ))}
      <Link href={`/tasks/${task.id}`} className="self-start text-sm text-sky-700 hover:underline">
        {messages.task.back}
      </Link>
    </div>
  );
}
