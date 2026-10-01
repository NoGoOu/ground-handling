import Link from "next/link";
import { notFound } from "next/navigation";
import { FormMessage } from "@/components/form-field";
import { RowButton } from "@/components/row-button";
import { getEquipmentType } from "@/lib/data/equipment-types";
import { messages } from "@/lib/messages";
import { canManageEquipment } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { addFieldAction, moveFieldAction, saveFieldAction, saveTypeAction } from "../actions";
import { FieldForm, TypeForm } from "../forms";

// One equipment type and its fields (CLAUDE.md, 11. mérföldkő, "Műszaki adatok").

const t = messages.equipmentTypes;

export default async function EquipmentTypePage(props: PageProps<"/equipment/types/[id]">) {
  await requireCapability(canManageEquipment);
  const { id } = await props.params;
  const { created } = await props.searchParams;
  const type = await getEquipmentType(id);
  if (!type) notFound();
  return (
    <div className="flex flex-col gap-4">
      <Link href="/equipment/types" className="self-start text-sm text-sky-700 hover:underline">
        {t.back}
      </Link>
      <h1 className="text-2xl font-bold">{type.name}</h1>
      {created && <FormMessage notice={t.created} />}
      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <TypeForm
          action={saveTypeAction.bind(null, type.id)}
          initial={{ name: type.name, code: type.code, active: type.active ? "on" : "" }}
          submitLabel={messages.form.save}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{t.fieldsTitle}</h2>
        {type.fields.length === 0 ? (
          <p className="text-sm text-neutral-600">{t.noFields}</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {type.fields.map((field, index) => (
              <li key={field.id} className={`flex flex-wrap items-end gap-2 ${field.active ? "" : "opacity-60"}`}>
                <span className="mb-2 w-6 text-right text-sm text-neutral-500">{index + 1}.</span>
                <FieldForm
                  action={saveFieldAction.bind(null, field.id)}
                  initial={{ name: field.name, kind: field.kind, unit: field.unit ?? "", active: field.active ? "on" : "" }}
                  submitLabel={messages.form.save}
                  withActive
                  kindLocked={field._count.values > 0}
                />
                <span className="mb-1 flex gap-1">
                  {index > 0 && <RowButton action={moveFieldAction.bind(null, field.id, -1)} label={t.moveUp} />}
                  {index < type.fields.length - 1 && <RowButton action={moveFieldAction.bind(null, field.id, 1)} label={t.moveDown} />}
                </span>
              </li>
            ))}
          </ol>
        )}
        <div className="flex flex-col gap-1 border-t border-neutral-100 pt-3">
          <span className="text-sm font-medium text-neutral-700">{t.addField}</span>
          <FieldForm action={addFieldAction.bind(null, type.id)} initial={{ name: "", kind: "DEADLINE", unit: "", active: "on" }} submitLabel={t.addField} withActive={false} />
        </div>
      </section>
    </div>
  );
}
