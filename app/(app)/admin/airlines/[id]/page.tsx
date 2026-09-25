import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { canManageAirlines } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { createTemplate } from "../../templates/actions";
import { TemplateCreateForm } from "../../templates/template-forms";
import { saveAirlineTaskTypes, updateAirline } from "../actions";
import { AirlineForm } from "../airline-form";
import { AirlineTaskTypesForm } from "../task-types-form";

const t = messages.airlineForm;

export default async function AirlinePage(props: PageProps<"/admin/airlines/[id]">) {
  await requireCapability(canManageAirlines);
  const { id } = await props.params;
  const [airline, taskTypes] = await Promise.all([
    prisma.airline.findUnique({
      where: { id },
      include: {
        templates: { orderBy: { name: "asc" }, include: { taskType: { select: { code: true } } } },
        taskTypes: true,
      },
    }),
    prisma.taskType.findMany({ orderBy: { code: "asc" }, select: { id: true, name: true, code: true } }),
  ]);
  if (!airline) notFound();
  const partsLabel = (template: { arrivalPart: boolean; departurePart: boolean }) =>
    messages.templateForm.partsChoice[
      template.arrivalPart && template.departurePart ? "BOTH" : template.arrivalPart ? "ARRIVAL" : "DEPARTURE"
    ];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/airlines" className="self-start text-sm text-sky-700 hover:underline">
        {messages.admin.back}
      </Link>
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">
          {t.editTitle}: {airline.name}
        </h1>
        <AirlineForm
          action={updateAirline.bind(null, airline.id)}
          initial={{ name: airline.name, iataCode: airline.iataCode }}
          submitLabel={messages.form.save}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">{messages.taskTypes.airlineTitle}</h2>
        <p className="max-w-3xl text-sm text-neutral-600">{messages.taskTypes.airlineHint}</p>
        <AirlineTaskTypesForm
          action={saveAirlineTaskTypes.bind(null, airline.id)}
          rows={taskTypes.map((taskType) => {
            const own = airline.taskTypes.find((row) => row.taskTypeId === taskType.id);
            return {
              taskType,
              templates: airline.templates
                .filter((template) => template.taskTypeId === taskType.id)
                .map(({ id, name }) => ({ id, name })),
              templateId: own?.templateId ?? null,
              active: own?.active ?? false,
              isPrimary: own?.isPrimary ?? false,
            };
          })}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">{t.templates}</h2>
        <TemplateCreateForm action={createTemplate.bind(null, airline.id)} taskTypes={taskTypes} />
        {airline.templates.length === 0 ? (
          <p className="text-neutral-600">{t.noTemplates}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {airline.templates.map((template) => (
              <li key={template.id}>
                <Link
                  href={`/admin/templates/${template.id}`}
                  className="flex rounded-lg border border-neutral-200 bg-white px-4 py-3 font-medium text-sky-700 hover:bg-sky-50"
                >
                  {template.name}
                  <span className="ml-auto text-sm font-normal text-neutral-600">
                    <span className="font-mono">{template.taskType.code}</span> · {partsLabel(template)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
