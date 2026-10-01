"use client";

import { useActionState, useState } from "react";
import { FormField, FormMessage } from "@/components/form-field";
import { messages } from "@/lib/messages";
import type { FieldFormInput, TypeFormInput } from "@/lib/validation/equipment";
import type { FieldFormState, TypeFormState } from "./actions";

const t = messages.equipmentTypes;

export function TypeForm({
  action,
  initial,
  submitLabel,
}: {
  action: (state: TypeFormState, formData: FormData) => Promise<TypeFormState>;
  initial: TypeFormInput;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (key: keyof TypeFormInput) => state.values?.[key] ?? initial[key];
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <FormMessage message={state.message} notice={state.notice} />
      <div className="flex flex-wrap items-end gap-3">
        <FormField label={t.name} error={state.errors?.name}>
          <input name="name" defaultValue={value("name")} maxLength={80} className="input w-64" required />
        </FormField>
        <FormField label={t.code} error={state.errors?.code}>
          <input name="code" defaultValue={value("code")} maxLength={12} className="input w-28 font-mono uppercase" required />
        </FormField>
        <label className="mb-2 flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={value("active") === "on"} className="size-5" />
          {t.active}
        </label>
        <button type="submit" disabled={pending} className="btn btn-primary mb-0.5">
          {pending ? messages.form.saving : submitLabel}
        </button>
      </div>
    </form>
  );
}

export function FieldForm({
  action,
  initial,
  submitLabel,
  withActive,
  kindLocked,
}: {
  action: (state: FieldFormState, formData: FormData) => Promise<FieldFormState>;
  initial: FieldFormInput;
  submitLabel: string;
  /** Only an existing field can be made inactive. */
  withActive: boolean;
  /** The kind of a field with values stays. */
  kindLocked?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (key: keyof FieldFormInput) => state.values?.[key] ?? initial[key];
  const [kind, setKind] = useState(value("kind"));
  return (
    <form action={formAction} className="flex flex-1 flex-col gap-1">
      <FormMessage message={state.message} notice={state.notice} />
      <div className="flex flex-wrap items-end gap-2">
        <FormField label={t.fieldName} error={state.errors?.name}>
          <input key={`n${value("name")}`} name="name" defaultValue={value("name")} maxLength={80} className="input w-56" required />
        </FormField>
        <FormField label={t.kind} error={state.errors?.kind}>
          {kindLocked ? (
            <>
              <input type="hidden" name="kind" value={kind} />
              <span className="input bg-neutral-50" title={t.kindLocked}>
                {t.kinds[kind as keyof typeof t.kinds]}
              </span>
            </>
          ) : (
            <select name="kind" value={kind} onChange={(event) => setKind(event.target.value)} className="input">
              {(["DEADLINE", "COUNTER", "TEXT"] as const).map((k) => (
                <option key={k} value={k}>
                  {t.kinds[k]}
                </option>
              ))}
            </select>
          )}
        </FormField>
        {kind === "COUNTER" && (
          <FormField label={t.unit} hint={t.unitHint} error={state.errors?.unit}>
            <input key={`u${value("unit")}`} name="unit" defaultValue={value("unit")} maxLength={20} className="input w-28" />
          </FormField>
        )}
        {withActive && (
          <label className="mb-2 flex items-center gap-1 text-sm">
            <input type="checkbox" name="active" defaultChecked={value("active") === "on"} className="size-5" />
            {t.active}
          </label>
        )}
        <button type="submit" disabled={pending} className="btn btn-secondary mb-0.5">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
