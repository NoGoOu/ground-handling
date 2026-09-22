import Link from "next/link";
import { DelayBadge, StatusBadge, TypeBadge } from "@/components/badges";
import { DateNav } from "@/components/date-nav";
import { TimeStack } from "@/components/time-stack";
import { listTaskViewsForDay, type TaskView } from "@/lib/data/tasks";
import { listAgentOptions } from "@/lib/data/users";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canManageFlights } from "@/lib/permissions";
import { dateParam } from "@/lib/search-params";
import { requireCapability } from "@/lib/session";
import { toLocalDate } from "@/lib/time";
import { assignAgents } from "./actions";
import { AssignmentForm, type AgentOption } from "./assignment-form";

const t = messages.flights;
const tt = messages.times;

function AgentsCell({ task, agents }: { task: TaskView; agents: AgentOption[] }) {
  return (
    <AssignmentForm
      action={assignAgents.bind(null, task.id)}
      type={task.timeline.shape.type}
      agents={agents}
      arrivalAgentId={task.arrivalAgent?.id ?? null}
      departureAgentId={task.departureAgent?.id ?? null}
    />
  );
}

export default async function FlightsPage(props: PageProps<"/flights">) {
  await requireCapability(canManageFlights);
  const { date: dateValue } = await props.searchParams;
  const date = dateParam(dateValue);
  const tasks = await listTaskViewsForDay(date);
  const agents = await listAgentOptions(tasks.flatMap((task) => [task.arrivalAgent?.id ?? null, task.departureAgent?.id ?? null]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{messages.pages.flights}</h1>
          <p className="text-sm text-neutral-600">{fmt(t.count, { count: tasks.length })}</p>
        </div>
        <Link href="/flights/new" className="btn btn-primary">
          {t.newFlight}
        </Link>
      </div>
      <DateNav basePath="/flights" date={date} today={toLocalDate(new Date())} />

      {tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-600">
          {t.empty}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-600 uppercase">
              <tr>
                <th className="px-3 py-2">{t.columns.flight}</th>
                <th className="px-3 py-2">{t.columns.stand}</th>
                <th className="px-3 py-2">{t.columns.arrival}</th>
                <th className="px-3 py-2">{t.columns.departure}</th>
                <th className="px-3 py-2">{t.columns.type}</th>
                <th className="px-3 py-2">{t.columns.status}</th>
                <th className="px-3 py-2">{t.columns.agents}</th>
                <th className="px-3 py-2">
                  <span className="sr-only">{t.edit}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {tasks.map((task) => (
                <tr key={task.id} className="align-top">
                  <td className="px-3 py-2">
                    <div className="font-semibold">
                      {task.flight.inboundFlightNumber} / {task.flight.outboundFlightNumber}
                    </div>
                    <div className="text-xs text-neutral-500">{task.flight.airline.name}</div>
                  </td>
                  <td className="px-3 py-2 font-medium">{task.flight.stand}</td>
                  <td className="px-3 py-2">
                    <TimeStack
                      day={date}
                      entries={[
                        { label: tt.sta, time: task.flight.sta },
                        { label: tt.eta, time: task.flight.eta },
                        { label: tt.ata, time: task.timeline.effectiveAta, emphasis: true },
                      ]}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <TimeStack
                      day={date}
                      entries={[
                        { label: tt.std, time: task.flight.std },
                        { label: tt.etd, time: task.flight.etd },
                        { label: tt.atd, time: task.timeline.effectiveAtd, emphasis: true },
                      ]}
                    />
                    <div className="mt-1">
                      <DelayBadge minutes={task.timeline.delayMinutes} />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <TypeBadge type={task.timeline.shape.type} />
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={task.status} />
                  </td>
                  <td className="px-3 py-2">
                    <AgentsCell task={task} agents={agents} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link href={`/flights/${task.flight.id}/edit`} className="text-sky-700 hover:underline">
                      {t.edit}
                    </Link>
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
