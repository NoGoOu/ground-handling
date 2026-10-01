import Link from "next/link";
import { ProcessSummary } from "@/components/process-summary";
import { listProcesses, processStartOptions } from "@/lib/data/processes";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canManageTraining, canOpenTrainingArea, processVisibleUserIds } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { formatDateTime } from "@/lib/time";
import { startProcessAction } from "./actions";
import { StartProcessForm } from "./forms";

// The training processes (CLAUDE.md, 10. mérföldkő, "Képzési folyamat"): the
// coordinator, the examiners and the releasers see everyone's, a team leader
// the team's, an agent their own; the coordinator starts them here.

const p = messages.processes;

export default async function ProcessesPage(props: PageProps<"/training/processes">) {
  const user = await requireCapability(canOpenTrainingArea);
  const { show } = await props.searchParams;
  const all = show === "all";
  const processes = (await listProcesses(processVisibleUserIds(user))).filter(
    (process) => all || process.state === "IN_PROGRESS" || process.state === "READY",
  );
  const options = canManageTraining(user) ? await processStartOptions() : null;

  return (
    <div className="flex flex-col gap-4">
      <Link href="/training" className="self-start text-sm text-sky-700 hover:underline">
        {messages.training.back}
      </Link>
      <h1 className="text-2xl font-bold">{p.title}</h1>
      <p className="max-w-3xl text-sm text-neutral-600">{p.intro}</p>

      {options && (
        <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="font-semibold">{p.startTitle}</h2>
          <StartProcessForm action={startProcessAction} agents={options.agents} trainings={options.trainings} />
        </section>
      )}

      <nav className="flex gap-2">
        {(["open", "all"] as const).map((key) => (
          <Link
            key={key}
            href={key === "all" ? "/training/processes?show=all" : "/training/processes"}
            aria-current={(key === "all") === all ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${(key === "all") === all ? "bg-sky-700 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"}`}
          >
            {p.filters[key]}
          </Link>
        ))}
      </nav>

      {processes.length === 0 ? (
        <p className="text-neutral-600">{p.empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
          {processes.map((process) => (
            <li key={process.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
              <span className="flex flex-col gap-1">
                <span className="font-medium">{process.user.name}</span>
                <span className="text-neutral-600">{fmt(p.row, { training: process.training.name, time: formatDateTime(process.startedAt) })}</span>
                <ProcessSummary process={process} />
              </span>
              <Link href={`/training/processes/${process.id}`} className="text-sky-700 hover:underline">
                {p.open}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
