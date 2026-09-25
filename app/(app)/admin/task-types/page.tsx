import Link from "next/link";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { canManageAirlines } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { createTaskType, updateTaskType } from "./actions";
import { TaskTypeForm } from "./task-type-form";

const t = messages.taskTypes;

export default async function TaskTypesPage() {
  await requireCapability(canManageAirlines);
  const taskTypes = await prisma.taskType.findMany({ orderBy: { code: "asc" } });

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin" className="self-start text-sm text-sky-700 hover:underline">
        {messages.admin.back}
      </Link>
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="max-w-3xl text-sm text-neutral-600">{t.hint}</p>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{t.create}</h2>
        <TaskTypeForm action={createTaskType} initial={{ name: "", code: "" }} submitLabel={t.create} />
      </section>

      {taskTypes.length === 0 ? (
        <p className="text-neutral-600">{t.empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {taskTypes.map((type) => (
            <li key={type.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <TaskTypeForm
                action={updateTaskType.bind(null, type.id)}
                initial={{ name: type.name, code: type.code }}
                submitLabel={t.save}
              />
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-neutral-500">{t.noDelete}</p>
    </div>
  );
}
