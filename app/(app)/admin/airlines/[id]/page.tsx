import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { canAdminister } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { createTemplate } from "../../templates/actions";
import { TemplateCreateForm } from "../../templates/template-forms";
import { updateAirline } from "../actions";
import { AirlineForm } from "../airline-form";

const t = messages.airlineForm;

export default async function AirlinePage(props: PageProps<"/admin/airlines/[id]">) {
  await requireCapability(canAdminister);
  const { id } = await props.params;
  const airline = await prisma.airline.findUnique({
    where: { id },
    include: { templates: { orderBy: { name: "asc" } } },
  });
  if (!airline) notFound();

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
        <h2 className="text-xl font-semibold">{t.templates}</h2>
        <TemplateCreateForm action={createTemplate.bind(null, airline.id)} />
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
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
