import Link from "next/link";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canManageAirlines } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";

const t = messages.airlineForm;

export default async function AirlinesPage() {
  await requireCapability(canManageAirlines);
  const airlines = await prisma.airline.findMany({
    include: { _count: { select: { templates: true } }, defaultTemplate: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin" className="self-start text-sm text-sky-700 hover:underline">
        {messages.admin.back}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <Link href="/admin/airlines/new" className="btn btn-primary">
          {t.newAirline}
        </Link>
      </div>
      {airlines.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-600">{t.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-600 uppercase">
              <tr>
                <th className="px-3 py-2">{t.columns.name}</th>
                <th className="px-3 py-2">{t.columns.iataCode}</th>
                <th className="px-3 py-2">{t.columns.templates}</th>
                <th className="px-3 py-2">{t.columns.defaultTemplate}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {airlines.map((airline) => (
                <tr key={airline.id}>
                  <td className="px-3 py-2">
                    <Link href={`/admin/airlines/${airline.id}`} className="font-medium text-sky-700 hover:underline">
                      {airline.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 font-mono">{airline.iataCode}</td>
                  <td className="px-3 py-2">{fmt(t.templateCount, { count: airline._count.templates })}</td>
                  <td className="px-3 py-2">{airline.defaultTemplate?.name ?? t.noDefaultTemplate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
