"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import { FormField, FormMessage } from "@/components/form-field";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";
import type { DelayFormState } from "../../actions";

const t = messages.delay;

/** "Késés rögzítése": new estimates for the parts the flight still works. */
export function DelayForm({
  action,
  withEta,
  withEtd,
}: {
  action: (state: DelayFormState, formData: FormData) => Promise<DelayFormState>;
  withEta: boolean;
  withEtd: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (key: "eta" | "etd" | "note") => state.values?.[key] ?? "";
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormMessage message={state.message} />
      <div className="grid gap-4 sm:grid-cols-2">
        {withEta && (
          <FormField label={t.eta} error={state.errors?.eta}>
            <input type="datetime-local" name="eta" defaultValue={value("eta")} className="input" />
          </FormField>
        )}
        {withEtd && (
          <FormField label={t.etd} error={state.errors?.etd}>
            <input type="datetime-local" name="etd" defaultValue={value("etd")} className="input" />
          </FormField>
        )}
      </div>
      <FormField label={t.note} hint={messages.form.optional} error={state.errors?.note}>
        <input name="note" defaultValue={value("note")} maxLength={200} placeholder={t.notePlaceholder} className="input" />
      </FormField>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? messages.form.saving : t.submit}
        </button>
        {state.notice && (
          <span role="status" className="text-sm text-emerald-700">
            {state.notice}
          </span>
        )}
      </div>
    </form>
  );
}

/** Cancel or restore one part; the server action is bound to the part and the new state. */
export function CancelToggle({
  action,
  cancelled,
}: {
  action: (state: ActionResult | null) => Promise<ActionResult>;
  cancelled: boolean;
}) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex items-center gap-3">
      <button
        type="submit"
        disabled={pending}
        className={`btn ${cancelled ? "btn-secondary" : "btn-secondary text-red-700"}`}
      >
        {cancelled ? messages.cancel.restore : messages.cancel.cancel}
      </button>
      <ActionFeedback result={result} />
    </form>
  );
}
