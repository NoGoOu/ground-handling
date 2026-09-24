"use client";

import { useActionState } from "react";
import { FormField, FormMessage } from "@/components/form-field";
import { messages } from "@/lib/messages";
import type { PlanningSettingsFormInput } from "@/lib/validation/planning";
import type { PlanningSettingsFormState } from "./actions";

const t = messages.planning.settings;

type NumberField = Exclude<keyof PlanningSettingsFormInput, "segmentTypeId">;

export function PlanningSettingsForm({
  action,
  initial,
  segmentTypes,
}: {
  action: (state: PlanningSettingsFormState, formData: FormData) => Promise<PlanningSettingsFormState>;
  initial: PlanningSettingsFormInput;
  segmentTypes: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (key: keyof PlanningSettingsFormInput) => state.values?.[key] ?? initial[key];

  const field = (name: NumberField, label: string, unit: string, max = 1440) => (
    <FormField label={label} hint={unit} error={state.errors?.[name]}>
      <input
        name={name}
        type="number"
        min={0}
        max={max}
        step={1}
        defaultValue={value(name)}
        className="input max-w-32"
        required
      />
    </FormField>
  );

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      <FormMessage message={state.message} notice={state.notice} />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-semibold">{t.shift}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("minShiftMinutes", t.minShiftMinutes, t.minutesUnit)}
          {field("maxShiftMinutes", t.maxShiftMinutes, t.minutesUnit)}
        </div>
        <FormField label={t.segmentType} hint={t.segmentTypeHint} error={state.errors?.segmentTypeId}>
          <select name="segmentTypeId" defaultValue={value("segmentTypeId")} className="input max-w-xs" required>
            <option value="">{messages.flightForm.none}</option>
            {segmentTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </FormField>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-semibold">{t.breakTitle}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("breakMinutes", t.breakMinutes, t.minutesUnit)}
          {field("breakAfterMinutes", t.breakAfterMinutes, t.minutesUnit)}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-semibold">{t.gapTitle}</legend>
        <p className="text-sm text-neutral-600">{t.gapHint}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("restMinutes", t.restMinutes, t.minutesUnit)}
          {field("overlapMinutes", t.overlapMinutes, t.minutesUnit)}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-semibold">{t.headcountTitle}</legend>
        <p className="text-sm text-neutral-600">{t.extraHint}</p>
        {field("extraPositions", t.extraPositions, t.positionsUnit, 50)}
      </fieldset>

      <div>
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? messages.form.saving : messages.form.save}
        </button>
      </div>
    </form>
  );
}
