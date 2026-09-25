"use client";

import { useActionState } from "react";
import { FormField, FormMessage } from "@/components/form-field";
import { messages } from "@/lib/messages";
import type { ExpirySettingsFormState } from "./actions";

const t = messages.settingsForm;

/** "Hamarosan lejár" days of the qualifications (6. mérföldkő). */
export function ExpirySettingsForm({
  action,
  initial,
}: {
  action: (state: ExpirySettingsFormState, formData: FormData) => Promise<ExpirySettingsFormState>;
  initial: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <FormMessage message={state.message} notice={state.notice} />
      <p className="text-sm text-neutral-600">{t.expiryHint}</p>
      <FormField label={t.expiryDays} hint={t.daysUnit} error={state.errors?.expiryWarningDays}>
        <input
          name="expiryWarningDays"
          type="number"
          min={0}
          max={365}
          step={1}
          defaultValue={state.values?.expiryWarningDays ?? initial}
          className="input max-w-32"
          required
        />
      </FormField>
      <div>
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? messages.form.saving : messages.form.save}
        </button>
      </div>
    </form>
  );
}
