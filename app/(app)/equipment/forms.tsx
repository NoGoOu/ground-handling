"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import { FormField, FormMessage } from "@/components/form-field";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";
import type { EquipmentFormInput, ValueFormInput } from "@/lib/validation/equipment";
import type { EquipmentFormState, ValueFormState } from "./actions";

const e = messages.equipment;

export function EquipmentForm({
  action,
  initial,
  types,
  submitLabel,
}: {
  action: (state: EquipmentFormState, formData: FormData) => Promise<EquipmentFormState>;
  initial: EquipmentFormInput;
  types: { id: string; name: string; code: string }[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (key: keyof EquipmentFormInput) => state.values?.[key] ?? initial[key];
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormMessage message={state.message} notice={state.notice} />
      <div className="flex flex-wrap items-end gap-3">
        <FormField label={e.type} error={state.errors?.typeId}>
          <select name="typeId" defaultValue={value("typeId")} className="input" required>
            <option value="" disabled>
              –
            </option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name} ({type.code})
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={e.identifier} hint={e.identifierHint} error={state.errors?.identifier}>
          <input name="identifier" defaultValue={value("identifier")} maxLength={30} className="input w-36 uppercase" required />
        </FormField>
        <FormField label={e.plate} hint={messages.form.optional} error={state.errors?.plate}>
          <input name="plate" defaultValue={value("plate")} maxLength={20} className="input w-32 uppercase" />
        </FormField>
      </div>
      <FormField label={e.description} hint={messages.form.optional} error={state.errors?.description}>
        <input name="description" defaultValue={value("description")} maxLength={500} className="input" />
      </FormField>
      <FormField label={e.note} hint={messages.form.optional} error={state.errors?.note}>
        <textarea name="note" defaultValue={value("note")} rows={2} maxLength={1000} className="input" />
      </FormField>
      <button type="submit" disabled={pending} className="btn btn-primary self-start">
        {pending ? messages.form.saving : submitLabel}
      </button>
    </form>
  );
}

/** The value of one field: a date, a reading with its due value, or a text. */
export function ValueForm({
  action,
  kind,
  unit,
  initial,
}: {
  action: (state: ValueFormState, formData: FormData) => Promise<ValueFormState>;
  kind: "DEADLINE" | "COUNTER" | "TEXT";
  unit: string | null;
  initial: ValueFormInput;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (key: keyof ValueFormInput) => state.values?.[key] ?? initial[key];
  const error = state.errors?.date ?? state.errors?.value ?? state.errors?.due ?? state.errors?.text ?? state.message;
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      {kind === "DEADLINE" && <input type="date" name="date" defaultValue={value("date")} aria-label={e.value} className="input w-auto py-1" />}
      {kind === "COUNTER" && (
        <>
          <input name="value" inputMode="decimal" defaultValue={value("value")} aria-label={e.reading} placeholder={e.reading} className="input w-28 py-1" />
          <input name="due" inputMode="decimal" defaultValue={value("due")} aria-label={e.due} placeholder={e.due} className="input w-28 py-1" />
          {unit && <span className="text-sm text-neutral-500">{unit}</span>}
        </>
      )}
      {kind === "TEXT" && <input name="text" defaultValue={value("text")} maxLength={500} aria-label={e.value} className="input min-w-64 flex-1 py-1" />}
      <button type="submit" disabled={pending} className="btn btn-secondary py-1 text-sm">
        {e.saveValue}
      </button>
      {error && <span className="text-sm text-red-700">{error}</span>}
      {!error && state.notice && <span className="text-sm text-emerald-700">{state.notice}</span>}
    </form>
  );
}

export function StatusForm({
  action,
  label,
  confirm,
}: {
  action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  label: string;
  confirm?: string;
}) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input name="note" maxLength={500} placeholder={e.statusNote} aria-label={e.statusNote} className="input w-64 py-1" />
      <button
        type="submit"
        disabled={pending}
        className="btn btn-secondary py-1"
        onClick={(event) => {
          if (confirm && !window.confirm(confirm)) event.preventDefault();
        }}
      >
        {label}
      </button>
      <ActionFeedback result={result} successText={e.statusChanged} />
    </form>
  );
}

export function DocumentUploadForm({ action }: { action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult> }) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="text-sm" required />
        <button type="submit" disabled={pending} className="btn btn-secondary py-1 text-sm">
          {pending ? messages.form.saving : e.upload}
        </button>
      </div>
      <ActionFeedback result={result} successText={e.uploadDone} />
    </form>
  );
}
