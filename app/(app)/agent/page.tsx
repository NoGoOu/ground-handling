import Link from "next/link";
import { Fragment } from "react";
import { DelayBadge, StatusBadge, TypeBadge } from "@/components/badges";
import { DateNav } from "@/components/date-nav";
import { TimeStack } from "@/components/time-stack";
import type { BoardBlock } from "@/lib/board";
import { listAgentBlocks } from "@/lib/data/shifts";
import { listTaskViewsForDay, taskAssignment, type TaskView } from "@/lib/data/tasks";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { assignedParts, canViewOwnTasks, canViewTask } from "@/lib/permissions";
import { dateParam } from "@/lib/search-params";
import { requireCapability, type CurrentUser } from "@/lib/session";
import { formatTimeOnDay, toLocalDate } from "@/lib/time";

const t = messages.agent;
const tt = messages.times;

function TaskCard({ task, user, day }: { task: TaskView; user: CurrentUser; day: string }) {
  const parts = assignedParts(user, taskAssignment(task));
  const next = task.timeline.rows.find((row) => parts.includes(row.milestone.part) && !row.actual);

  return (
    <li>
      <Link
        href={`/tasks/${task.id}`}
        className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm active:bg-neutral-50"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xl font-bold">
            {task.flight.inboundFlightNumber} / {task.flight.outboundFlightNumber}
          </span>
          <StatusBadge status={task.status} />
          <TypeBadge type={task.timeline.shape.type} />
          <DelayBadge minutes={task.timeline.delayMinutes} />
        </div>
        <div className="text-neutral-700">
          {fmt(messages.task.stand, { stand: task.flight.stand })} ·{" "}
          {fmt(t.myParts, { parts: parts.map((p) => messages.part[p]).join(", ") })}
        </div>
        <div className="grid grid-cols-2 gap-3 text-base">
          <TimeStack
            day={day}
            entries={[
              { label: tt.sta, time: task.flight.sta },
              { label: tt.eta, time: task.flight.eta },
              { label: tt.ata, time: task.timeline.effectiveAta, emphasis: true },
            ]}
          />
          <TimeStack
            day={day}
            entries={[
              { label: tt.std, time: task.flight.std },
              { label: tt.etd, time: task.flight.etd },
              { label: tt.atd, time: task.timeline.effectiveAtd, emphasis: true },
            ]}
          />
        </div>
        <div className="rounded-lg bg-sky-50 px-3 py-2 font-medium text-sky-900">
          {next
            ? fmt(t.next, { name: next.milestone.name, time: formatTimeOnDay(next.planned, day) })
            : t.allRecorded}
        </div>
      </Link>
    </li>
  );
}

/** A non-operative block of the agent's own roster, travel time included. */
function BlockCard({ block, day }: { block: BoardBlock; day: string }) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-xl font-bold text-violet-900">{block.label}</span>
        <span className="text-lg text-violet-900 tabular-nums">
          {formatTimeOnDay(block.segment.start, day)}–{formatTimeOnDay(block.segment.end, day)}
        </span>
      </div>
      <div className="text-violet-800">
        {fmt(t.blockTravel, { from: formatTimeOnDay(block.start, day), to: formatTimeOnDay(block.end, day) })}
      </div>
      {block.location && <div className="text-neutral-700">{block.location}</div>}
      {block.description && <div className="text-neutral-600">{block.description}</div>}
    </li>
  );
}

export default async function AgentPage(props: PageProps<"/agent">) {
  const user = await requireCapability(canViewOwnTasks);
  const { date: dateValue } = await props.searchParams;
  const date = dateParam(dateValue);
  const [taskViews, blocks] = await Promise.all([
    listTaskViewsForDay(date, { OR: [{ arrivalAgentId: user.id }, { departureAgentId: user.id }] }),
    listAgentBlocks(user.id, date),
  ]);
  const tasks = taskViews.filter((task) => canViewTask(user, taskAssignment(task)));

  // Tasks and blocks share one list, in time order.
  const items = [
    ...tasks.map((task) => ({
      key: task.id,
      at: task.timeline.shape.windows[0]?.start ?? task.flight.sta,
      node: <TaskCard task={task} user={user} day={date} />,
    })),
    ...blocks.map((block) => ({ key: block.id, at: block.start, node: <BlockCard block={block} day={date} /> })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{messages.pages.agent}</h1>
      <DateNav basePath="/agent" date={date} today={toLocalDate(new Date())} />
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-600">{t.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <Fragment key={item.key}>{item.node}</Fragment>
          ))}
        </ul>
      )}
    </div>
  );
}
