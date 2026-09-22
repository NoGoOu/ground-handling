"use client";

import { useActionState } from "react";
import { FormField, FormMessage } from "@/components/form-field";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import type { SettingsFormInput } from "@/lib/validation/settings";
import type { SettingsFormState } from "./actions";

const t = messages.settingsForm;

export function SettingsForm({
  action,
  initial,
}: {
  action: (state: SettingsFormState, formData: FormData) => Promise<SettingsFormState>;
  initial: SettingsFormInput;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (key: keyof SettingsFormInput) => state.values?.[key] ?? initial[key];
  const green = Number(value("deviationGreenMaxMinutes"));
  const yellow = Number(value("deviationYellowMaxMinutes"));

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <FormMessage message={state.message} notice={state.notice} />
      <p className="text-sm text-neutral-600">{t.deviationHint}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t.green} hint={t.minutesUnit} error={state.errors?.deviationGreenMaxMinutes}>
          <input
            name="deviationGreenMaxMinutes"
            type="number"
            min={0}
            max={1440}
            step={1}
            defaultValue={value("deviationGreenMaxMinutes")}
            className="input max-w-32"
            required
          />
        </FormField>
        <FormField label={t.yellow} hint={t.minutesUnit} error={state.errors?.deviationYellowMaxMinutes}>
          <input
            name="deviationYellowMaxMinutes"
            type="number"
            min={0}
            max={1440}
            step={1}
            defaultValue={value("deviationYellowMaxMinutes")}
            className="input max-w-32"
            required
          />
        </FormField>
      </div>
      {Number.isFinite(green) && Number.isFinite(yellow) && green <= yellow && (
        <p className="text-sm text-neutral-600">
          {fmt(t.example, { green, yellow, yellowFrom: green + 1 })}
        </p>
      )}
      <div>
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? messages.form.saving : messages.form.save}
        </button>
      </div>
    </form>
  );
}
