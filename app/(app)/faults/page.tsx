import Link from "next/link";
import { FaultStatusBadge } from "@/components/badges";
import { listFaults } from "@/lib/data/faults";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canOpenFaults, canReportFault, faultVisibleReporterIds } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { formatDateTime } from "@/lib/time";

// The faults the user may see (CLAUDE.md, 11. mérföldkő, "Hibajegy"): the
// technical staff and the shift lead everyone's, a reporter their own. Open
// ones first; the closed ones on request.

const f = messages.faults;

export default async function FaultsPage(props: PageProps<"/faults">) {
  const user = await requireCapability(canOpenFaults);
  const { show } = await props.searchParams;
  const all = show === "all";
  const faults = await listFaults(faultVisibleReporterIds(user), { open: !all });
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{f.title}</h1>
      <p className="max-w-3xl text-sm text-neutral-600">{f.listHint}</p>
      {canReportFault(user) && (
        <Link href="/faults/new" className="btn btn-primary btn-lg self-stretch sm:self-start">
          {f.report}
        </Link>
      )}
      <nav className="flex gap-2">
        {(["open", "all"] as const).map((key) => (
          <Link
            key={key}
            href={key === "all" ? "/faults?show=all" : "/faults"}
            aria-current={(key === "all") === all ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${(key === "all") === all ? "bg-sky-700 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"}`}
          >
            {f.filters[key]}
          </Link>
        ))}
      </nav>
      {faults.length === 0 ? (
        <p className="text-neutral-600">{f.empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
          {faults.map((fault) => (
            <li key={fault.id}>
              <Link href={`/faults/${fault.id}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-neutral-50">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{fault.equipment.identifier}</span>
                  <span className="text-sm text-neutral-600">{fault.equipment.type.name}</span>
                  <FaultStatusBadge status={fault.status} />
                  {fault.reportedOutOfService && fault.status !== "CLOSED" && (
                    <span className="text-xs font-medium text-red-700">{messages.equipment.statuses.OUT_OF_SERVICE}</span>
                  )}
                </span>
                <span className="line-clamp-2 text-sm">{fault.description}</span>
                <span className="text-xs text-neutral-500">
                  {fmt(f.row, { reporter: fault.reportedBy.name, time: formatDateTime(fault.reportedAt) })}
                  {fault.takenBy && <> · {fmt(f.takenRow, { name: fault.takenBy.name })}</>}
                  {" · "}
                  {fmt(f.counts, { comments: fault._count.comments, photos: fault._count.photos })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
