"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import { FormField, FormMessage } from "@/components/form-field";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";
import type { DelayCodeFormInput } from "@/lib/validation/delay-code";
import type { ApiKeyFormState, DelayCodeFormState } from "./actions";

const t = messages.messaging.apiKeys;

export function ApiKeyForm({ action }: { action: (state: ApiKeyFormState, formData: FormData) => Promise<ApiKeyFormState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormMessage message={state.error} />
      {state.key && (
        <div role="status" className="flex flex-col gap-1 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <span>{t.created}</span>
          <code className="select-all break-all rounded bg-white px-2 py-1 font-mono text-sm">{state.key}</code>
        </div>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <FormField label={t.name}>
          <input name="name" maxLength={60} className="input" required />
        </FormField>
        <button type="submit" disabled={pending} className="btn btn-primary mb-0.5">
          {pending ? messages.form.saving : t.create}
        </button>
      </div>
    </form>
  );
}

export function RevokeKeyButton({ action }: { action: () => Promise<ActionResult> }) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <button
        type="submit"
        disabled={pending}
        className="btn btn-secondary py-1 text-xs"
        onClick={(event) => {
          if (!window.confirm(t.confirmRevoke)) event.preventDefault();
        }}
      >
        {t.revoke}
      </button>
      <ActionFeedback result={result} successText={t.revokedDone} />
    </form>
  );
}

export function DelayCodeForm({
  action,
  initial,
  submitLabel,
}: {
  action: (state: DelayCodeFormState, formData: FormData) => Promise<DelayCodeFormState>;
  initial: DelayCodeFormInput;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (key: keyof DelayCodeFormInput) => state.values?.[key] ?? initial[key];
  const d = messages.delayCodes;
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <FormMessage message={state.message} notice={state.notice} />
      <div className="flex flex-wrap items-end gap-3">
        <FormField label={d.code} error={state.errors?.code}>
          <input key={value("code")} name="code" defaultValue={value("code")} className="input w-20 font-mono uppercase" required />
        </FormField>
        <FormField label={d.description} hint={messages.form.optional} error={state.errors?.description}>
          <input key={value("description")} name="description" defaultValue={value("description")} maxLength={200} className="input w-72" />
        </FormField>
        <label className="mb-2 flex items-center gap-2 text-sm">
          <input key={value("active")} type="checkbox" name="active" defaultChecked={value("active") === "on"} />
          {d.active}
        </label>
        <button type="submit" disabled={pending} className="btn btn-secondary mb-0.5">
          {pending ? messages.form.saving : submitLabel}
        </button>
      </div>
    </form>
  );
}
