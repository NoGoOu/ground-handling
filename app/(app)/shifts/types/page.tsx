import Link from "next/link";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canManageSegmentTypes } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { createSegmentType, updateSegmentType } from "./actions";
import { NewSegmentTypeForm, SegmentTypeRowForm } from "./segment-type-forms";

const t = messages.segmentTypeForm;

export default async function SegmentTypesPage() {
  await requireCapability(canManageSegmentTypes);
  const types = await prisma.segmentType.findMany({
    include: { _count: { select: { segments: true } } },
    orderBy: [{ operative: "desc" }, { name: "asc" }],
  });

  return (
    <div className="flex flex-col gap-4">
      <Link href="/shifts" className="self-start text-sm text-sky-700 hover:underline">
        {t.back}
      </Link>
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="text-sm text-neutral-600">{t.hint}</p>

      <section className="flex flex-col gap-2 rounded-xl border border-dashed border-neutral-300 bg-white p-4">
        <h2 className="font-semibold">{t.newType}</h2>
        <NewSegmentTypeForm action={createSegmentType} />
      </section>

      {types.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-600">{t.empty}</p>
      ) : (
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {types.map((type) => (
            <SegmentTypeRowForm
              key={type.id}
              action={updateSegmentType.bind(null, type.id)}
              initial={{ name: type.name, code: type.code, operative: type.operative, active: type.active }}
              usage={fmt(t.inUse, { count: type._count.segments })}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
