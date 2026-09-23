import Link from "next/link";
import { DelayBadge, StatusBadge, TypeBadge } from "@/components/badges";
import { DateNav } from "@/components/date-nav";
import { TimeStack } from "@/components/time-stack";
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

export default async function AgentPage(props: PageProps<"/agent">) {
  const user = await requireCapability(canViewOwnTasks);
  const { date: dateValue } = await props.searchParams;
  const date = dateParam(dateValue);
  const tasks = (
    await listTaskViewsForDay(date, { OR: [{ arrivalAgentId: user.id }, { departureAgentId: user.id }] })
  ).filter((task) => canViewTask(user, taskAssignment(task)));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{messages.pages.agent}</h1>
      <DateNav basePath="/agent" date={date} today={toLocalDate(new Date())} />
      {tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-600">{t.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} user={user} day={date} />
          ))}
        </ul>
      )}
    </div>
  );
}
