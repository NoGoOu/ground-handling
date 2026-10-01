"use client";

import { useActionState } from "react";
import { FormField, FormMessage } from "@/components/form-field";
import { messages } from "@/lib/messages";
import type { FormState } from "@/lib/validation/form";

const t = messages.settingsForm;

/**
 * "Hamarosan lejár" days: of the qualifications (6. mérföldkő) and of the
 * deadlines of ground equipment (11. mérföldkő), each a form of its own.
 */
export function ExpirySettingsForm<N extends string>({
  action,
  name,
  hint,
  initial,
}: {
  action: (state: FormState<Record<N, string>>, formData: FormData) => Promise<FormState<Record<N, string>>>;
  name: N;
  hint: string;
  initial: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <FormMessage message={state.message} notice={state.notice} />
      <p className="text-sm text-neutral-600">{hint}</p>
      <FormField label={t.expiryDays} hint={t.daysUnit} error={state.errors?.[name]}>
        <input
          name={name}
          type="number"
          min={0}
          max={365}
          step={1}
          defaultValue={state.values?.[name] ?? initial}
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
