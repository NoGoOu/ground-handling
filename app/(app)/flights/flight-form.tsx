"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormField, FormMessage } from "@/components/form-field";
import { messages } from "@/lib/messages";
import type { FlightFormInput } from "@/lib/validation/flight";
import type { FlightFormState } from "./actions";

const t = messages.flightForm;

export interface TemplateOption {
  id: string;
  name: string;
  airline: string;
}

export function FlightForm({
  action,
  templates,
  initial,
  submitLabel,
}: {
  action: (state: FlightFormState, formData: FormData) => Promise<FlightFormState>;
  templates: TemplateOption[];
  initial: FlightFormInput;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (key: keyof FlightFormInput) => state.values?.[key] ?? initial[key];
  const error = (key: keyof FlightFormInput) => state.errors?.[key];
  const airlines = [...new Set(templates.map((tpl) => tpl.airline))];

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <FormMessage message={state.message} />
      <FormField label={t.template} error={error("templateId")}>
        <select name="templateId" defaultValue={value("templateId")} className="input" required>
          <option value="" disabled>
            –
          </option>
          {airlines.map((airline) => (
            <optgroup key={airline} label={airline}>
              {templates
                .filter((tpl) => tpl.airline === airline)
                .map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {airline} – {tpl.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </FormField>

      <FormField label={t.stand} hint={messages.form.optional} error={error("stand")}>
        <input name="stand" defaultValue={value("stand")} maxLength={10} className="input max-w-40" />
      </FormField>

      <p className="text-sm text-neutral-600">
        {t.timeHint} {t.partsHint}
      </p>
      {/* Rule 11: either part may be left empty, but not both. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-4">
          <legend className="px-1 font-semibold">{t.arrivalPart}</legend>
          <FormField label={t.inbound} error={error("inboundFlightNumber")}>
            <input name="inboundFlightNumber" defaultValue={value("inboundFlightNumber")} className="input" />
          </FormField>
          <FormField label={t.sta} error={error("sta")}>
            <input type="datetime-local" name="sta" defaultValue={value("sta")} className="input" />
          </FormField>
        </fieldset>
        <fieldset className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-4">
          <legend className="px-1 font-semibold">{t.departurePart}</legend>
          <FormField label={t.outbound} error={error("outboundFlightNumber")}>
            <input name="outboundFlightNumber" defaultValue={value("outboundFlightNumber")} className="input" />
          </FormField>
          <FormField label={t.std} error={error("std")}>
            <input type="datetime-local" name="std" defaultValue={value("std")} className="input" />
          </FormField>
        </fieldset>
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? messages.form.saving : submitLabel}
        </button>
        <Link href="/flights" className="btn btn-secondary">
          {messages.form.cancel}
        </Link>
      </div>
    </form>
  );
}
