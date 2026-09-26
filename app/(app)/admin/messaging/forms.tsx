"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import { FormField, FormMessage } from "@/components/form-field";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";
import type { ApiKeyFormState } from "./actions";

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
