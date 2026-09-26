import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TaskTypeBadge } from "@/components/badges";
import { InfographicView } from "@/components/infographic";
import { MessageContent } from "@/components/message-content";
import { listFlightMessages, versionGroups, type FlightMessage } from "@/lib/data/messages";
import { flightPartAgents, getTaskView, taskAssignment } from "@/lib/data/tasks";
import { flightLabel } from "@/lib/flight";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { prisma } from "@/lib/db";
import { canSendPartMessage, canViewFlightMessages, canViewTask } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { warningText } from "@/lib/telex/describe";
import { buildInfographic, type CurrentMessage } from "@/lib/telex/infographic";
import type { Part } from "@/lib/telex/match";
import { formatDateTime } from "@/lib/time";
import { TaskTabs } from "../tabs";
import { previewMvt, sendMvt } from "./actions";
import { MvtPanel } from "./mvt-panel";

// The "Üzenetek" tab (CLAUDE.md, 7. mérföldkő): the messages of the task's
// flight per part, with their versions, raw and parsed, and their warnings.
// The shift lead and the agent see it by the message viewing permission.

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

function MessageCard({ message }: { message: FlightMessage }) {
  return (
    <article className="flex flex-col gap-2">
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-mono font-semibold">{kindLabel(message)}</span>
        <span className="rounded bg-neutral-100 px-1.5 text-xs text-neutral-700">
          {message.direction === "INBOUND" ? t.inbound : t.outbound}
        </span>
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
    </article>
  );
}

function PartMessages({ rows, part, children }: { rows: FlightMessage[]; part: Part; children?: ReactNode }) {
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
            <MessageCard message={latest} />
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
  // The departure MVT: whoever may send on the departure part (7. mérföldkő).
  const canSend = !!task.flight.std && !task.flight.departureCancelled && canSendPartMessage(user, agents.departure);
  const departure = canSend
    ? await prisma.flight.findUnique({ where: { id: task.flight.id }, select: { departureRegistration: true, destination: true } })
    : null;
  const offBlock = task.timeline.effectiveAtd;
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
        <PartMessages key={part} rows={rows} part={part}>
          {part === "DEPARTURE_PART" && departure && (
            <div className="flex flex-col gap-2 border-t border-neutral-200 pt-3">
              <h3 className="font-semibold">{messages.outbound.title}</h3>
              <p className="text-sm text-neutral-600">{messages.outbound.hint}</p>
              <MvtPanel
                previewAction={previewMvt.bind(null, task.id)}
                sendAction={sendMvt.bind(null, task.id)}
                offBlock={offBlock ? formatDateTime(offBlock) : null}
                initial={{
                  registration: departure.departureRegistration ?? "",
                  airborne: "",
                  estimatedArrival: "",
                  destination: departure.destination ?? "",
                  si: "",
                }}
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
