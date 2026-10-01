import Link from "next/link";
import { notFound } from "next/navigation";
import { DeadlineBadge, EquipmentStatusBadge } from "@/components/badges";
import { FormMessage } from "@/components/form-field";
import { RowButton } from "@/components/row-button";
import { getEquipment, listActiveTypes, toFieldValue } from "@/lib/data/equipment";
import { canMoveEquipment, equipmentStepNeeds, type EquipmentStatus } from "@/lib/equipment/faults";
import { counterStatus, deadlineStatus } from "@/lib/equipment/status";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { can, canManageEquipment, canViewEquipment } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { formatDateTime, toLocalDate } from "@/lib/time";
import { changeStatusAction, removeDocumentAction, saveEquipmentAction, saveValueAction, uploadDocumentAction } from "../actions";
import { DocumentUploadForm, EquipmentForm, StatusForm, ValueForm } from "../forms";

// The data sheet of a piece of equipment (CLAUDE.md, 11. mérföldkő): its data,
// its status with the log, its technical data with the log of every change,
// and its documents.

const e = messages.equipment;

/** A logged value in words: a date, a reading with its due value, or a text. */
function logText(kind: string, unit: string | null, value: unknown): string {
  const v = (value ?? {}) as { date?: string | null; value?: number | null; due?: number | null; text?: string | null };
  if (kind === "DEADLINE") return v.date ?? e.empty_;
  if (kind === "COUNTER") {
    if (v.value === null || v.value === undefined) return e.empty_;
    const reading = `${v.value}${unit ? ` ${unit}` : ""}`;
    return v.due === null || v.due === undefined ? reading : `${reading} (${fmt(e.counterDue, { due: v.due, unit: unit ?? "" }).trim()})`;
  }
  return v.text ?? e.empty_;
}

export default async function EquipmentSheetPage(props: PageProps<"/equipment/[id]">) {
  const user = await requireCapability(canViewEquipment);
  const { id } = await props.params;
  const { created } = await props.searchParams;
  const equipment = await getEquipment(id);
  if (!equipment) notFound();
  const manage = canManageEquipment(user);
  const today = toLocalDate(new Date());
  const { equipmentWarningDays } = await getSettings();
  const types = manage ? await listActiveTypes() : [];
  const valueOf = new Map(equipment.values.map((row) => [row.fieldId, toFieldValue(row)]));
  const steps = (["OPERATIONAL", "OUT_OF_SERVICE", "RETIRED"] as EquipmentStatus[]).filter(
    (to) => canMoveEquipment(equipment.status, to) && can(user, equipmentStepNeeds(equipment.status, to)),
  );

  return (
    <div className="flex flex-col gap-4">
      <Link href="/equipment" className="self-start text-sm text-sky-700 hover:underline">
        {e.back}
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">{equipment.identifier}</h1>
        <EquipmentStatusBadge status={equipment.status} />
        <span className="text-neutral-600">{equipment.type.name}</span>
        {equipment.plate && <span className="font-mono text-sm text-neutral-500">{equipment.plate}</span>}
      </div>
      {created && <FormMessage notice={e.created} />}

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{e.dataTitle}</h2>
        {manage ? (
          <EquipmentForm
            action={saveEquipmentAction.bind(null, equipment.id)}
            initial={{
              typeId: equipment.typeId,
              identifier: equipment.identifier,
              plate: equipment.plate ?? "",
              description: equipment.description ?? "",
              note: equipment.note ?? "",
            }}
            types={types.some((type) => type.id === equipment.typeId) ? types : [{ id: equipment.typeId, name: equipment.type.name, code: equipment.type.code }, ...types]}
            submitLabel={messages.form.save}
          />
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {equipment.description && (
              <>
                <dt className="text-neutral-500">{e.description}</dt>
                <dd>{equipment.description}</dd>
              </>
            )}
            {equipment.note && (
              <>
                <dt className="text-neutral-500">{e.note}</dt>
                <dd className="whitespace-pre-line">{equipment.note}</dd>
              </>
            )}
          </dl>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{e.statusTitle}</h2>
        <p className="max-w-3xl text-sm text-neutral-600">{e.statusHint}</p>
        {steps.map((to) => (
          <StatusForm
            key={to}
            action={changeStatusAction.bind(null, equipment.id, to)}
            label={e.toStatus[to]}
            confirm={to === "RETIRED" ? e.confirmRetire : undefined}
          />
        ))}
        {equipment.events.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-neutral-600">{e.statusLog}</summary>
            <ul className="mt-2 flex flex-col gap-0.5">
              {equipment.events.map((event) => (
                <li key={event.id}>
                  {fmt(e.statusRow, {
                    time: formatDateTime(event.createdAt),
                    from: event.fromStatus ? e.statuses[event.fromStatus] : "–",
                    to: e.statuses[event.toStatus],
                    name: event.createdBy.name,
                  })}
                  {event.faultId && <> · {e.fromFault}</>}
                  {event.note && <span className="text-neutral-600"> – {event.note}</span>}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{e.technicalTitle}</h2>
        {equipment.type.fields.length === 0 ? (
          <p className="text-sm text-neutral-600">{e.noFields}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100">
            {equipment.type.fields.map((field) => {
              const value = valueOf.get(field.id);
              return (
                <li key={field.id} className="flex flex-col gap-1 py-2 text-sm">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{field.name}</span>
                    {field.kind === "DEADLINE" && (
                      <>
                        <span className="tabular-nums">{value?.dateValue ?? e.noValue}</span>
                        <DeadlineBadge status={deadlineStatus(value?.dateValue ?? null, today, equipmentWarningDays)} />
                      </>
                    )}
                    {field.kind === "COUNTER" && (
                      <>
                        <span className="tabular-nums">
                          {value?.numberValue === null || value?.numberValue === undefined ? e.noValue : fmt(e.counterValue, { value: value.numberValue, unit: field.unit ?? "" })}
                        </span>
                        {value?.dueValue !== null && value?.dueValue !== undefined && (
                          <span className="text-neutral-500">{fmt(e.counterDue, { due: value.dueValue, unit: field.unit ?? "" })}</span>
                        )}
                        {counterStatus(value?.numberValue ?? null, value?.dueValue ?? null) === "DUE" && (
                          <DeadlineBadge status="EXPIRED" label={e.counterStates.DUE} />
                        )}
                      </>
                    )}
                    {field.kind === "TEXT" && <span>{value?.textValue ?? e.noValue}</span>}
                  </span>
                  {manage && (
                    <ValueForm
                      action={saveValueAction.bind(null, equipment.id, field.id)}
                      kind={field.kind}
                      unit={field.unit}
                      initial={{
                        date: value?.dateValue ?? "",
                        value: value?.numberValue === null || value?.numberValue === undefined ? "" : String(value.numberValue),
                        due: value?.dueValue === null || value?.dueValue === undefined ? "" : String(value.dueValue),
                        text: value?.textValue ?? "",
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <details className="text-sm">
          <summary className="cursor-pointer text-neutral-600">{e.valueLog}</summary>
          {equipment.valueLogs.length === 0 ? (
            <p className="mt-2 text-neutral-600">{e.noValueLog}</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-0.5">
              {equipment.valueLogs.map((log) => (
                <li key={log.id}>
                  {fmt(e.valueRow, {
                    time: formatDateTime(log.changedAt),
                    field: log.field.name,
                    old: logText(log.field.kind, log.field.unit, log.oldValue),
                    new: logText(log.field.kind, log.field.unit, log.newValue),
                    name: log.changedBy.name,
                  })}
                </li>
              ))}
            </ul>
          )}
        </details>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{e.documentsTitle}</h2>
        <p className="text-sm text-neutral-600">{e.documentsHint}</p>
        {equipment.documents.length === 0 ? (
          <p className="text-sm text-neutral-600">{e.noDocuments}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 text-sm">
            {equipment.documents.map((document) => (
              <li key={document.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                <span className="flex flex-col">
                  <span className={document.storageKey ? "font-medium" : "text-neutral-400 line-through"}>{document.fileName}</span>
                  <span className="text-neutral-500">
                    {fmt(e.uploaded, { name: document.uploadedBy.name, at: formatDateTime(document.uploadedAt) })}
                    {document.removedBy && document.removedAt && <> · {fmt(e.removed, { name: document.removedBy.name, at: formatDateTime(document.removedAt) })}</>}
                  </span>
                </span>
                {document.storageKey && (
                  <span className="flex items-center gap-2">
                    <a href={`/api/equipment-files/${document.id}`} target="_blank" rel="noopener noreferrer" className="text-sky-700 hover:underline">
                      {e.open}
                    </a>
                    {manage && <RowButton action={removeDocumentAction.bind(null, document.id)} label={e.remove} confirm={e.confirmRemove} />}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {manage && <DocumentUploadForm action={uploadDocumentAction.bind(null, equipment.id)} />}
      </section>
    </div>
  );
}
