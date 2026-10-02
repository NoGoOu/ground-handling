"use client";

import { useActionState } from "react";
import { FormField, FormMessage } from "@/components/form-field";
import { messages } from "@/lib/messages";
import type { FormState } from "@/lib/validation/form";

/**
 * One whole-number setting in a form of its own: the "hamarosan lejár" days of
 * the qualifications (6. mérföldkő) and of ground equipment (11. mérföldkő),
 * and the refresh of the roster calendars (12. mérföldkő).
 */
export function NumberSettingForm<N extends string>({
  action,
  name,
  label,
  unit,
  hint,
  min,
  max,
  initial,
}: {
  action: (state: FormState<Record<N, string>>, formData: FormData) => Promise<FormState<Record<N, string>>>;
  name: N;
  label: string;
  unit: string;
  hint: string;
  min: number;
  max: number;
  initial: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <FormMessage message={state.message} notice={state.notice} />
      <p className="text-sm text-neutral-600">{hint}</p>
      <FormField label={label} hint={unit} error={state.errors?.[name]}>
        <input
          name={name}
          type="number"
          min={min}
          max={max}
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
