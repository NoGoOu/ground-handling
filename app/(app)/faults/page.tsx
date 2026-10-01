import Link from "next/link";
import { FaultStatusBadge } from "@/components/badges";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { canReportFault, faultVisibleReporterIds } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { formatDateTime } from "@/lib/time";

// The faults the user may see (CLAUDE.md, 11. mérföldkő, "Hibajegy"): their
// own, or everyone's by the scope of viewing faults; newest first.

const f = messages.faults;

export default async function FaultsPage() {
  const user = await requireCapability((u) => canReportFault(u) || faultVisibleReporterIds(u) === null);
  const reporters = faultVisibleReporterIds(user);
  const faults = await prisma.fault.findMany({
    where: reporters ? { reportedById: { in: reporters } } : {},
    include: { equipment: { select: { identifier: true, type: { select: { name: true } } } }, reportedBy: { select: { name: true } } },
    orderBy: { reportedAt: "desc" },
    take: 200,
  });
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{f.title}</h1>
      {canReportFault(user) && (
        <Link href="/faults/new" className="btn btn-primary btn-lg self-stretch sm:self-start">
          {f.report}
        </Link>
      )}
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
                </span>
                <span className="line-clamp-2 text-sm">{fault.description}</span>
                <span className="text-xs text-neutral-500">
                  {fault.reportedBy.name} · {formatDateTime(fault.reportedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
