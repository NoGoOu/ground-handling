import Link from "next/link";
import { listEquipmentTypes } from "@/lib/data/equipment-types";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canManageEquipment } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { saveTypeAction } from "./actions";
import { TypeForm } from "./forms";

// Equipment types (CLAUDE.md, 11. mérföldkő, "Eszközök"): the technical staff
// and the admin keep them, each with its list of technical data fields.

const t = messages.equipmentTypes;

export default async function EquipmentTypesPage() {
  await requireCapability(canManageEquipment);
  const types = await listEquipmentTypes();
  return (
    <div className="flex flex-col gap-4">
      <Link href="/equipment" className="self-start text-sm text-sky-700 hover:underline">
        {messages.nav.equipment}
      </Link>
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="max-w-3xl text-sm text-neutral-600">{t.intro}</p>
      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{t.create}</h2>
        <TypeForm action={saveTypeAction.bind(null, null)} initial={{ name: "", code: "", active: "on" }} submitLabel={t.create} />
      </section>
      {types.length === 0 ? (
        <p className="text-neutral-600">{t.empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
          {types.map((type) => (
            <li key={type.id} className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm ${type.active ? "" : "text-neutral-400"}`}>
              <span className="flex flex-col">
                <span className="font-medium">{type.name}</span>
                <span className="text-neutral-500">
                  {fmt(t.row, { code: type.code, fields: type._count.fields, equipment: type._count.equipment })}
                  {!type.active && <> · {t.inactive}</>}
                </span>
              </span>
              <Link href={`/equipment/types/${type.id}`} className="text-sky-700 hover:underline">
                {t.edit}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
