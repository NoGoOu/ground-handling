"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormField, FormMessage } from "@/components/form-field";
import { messages } from "@/lib/messages";
import type { FlightFormInput } from "@/lib/validation/flight";
import type { FlightFormState } from "./actions";

const t = messages.flightForm;

export interface AirlineOption {
  id: string;
  label: string;
}

export function FlightForm({
  action,
  airlines,
  initial,
  submitLabel,
}: {
  action: (state: FlightFormState, formData: FormData) => Promise<FlightFormState>;
  airlines: AirlineOption[];
  initial: FlightFormInput;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (key: keyof FlightFormInput) => state.values?.[key] ?? initial[key] ?? "";
  const error = (key: keyof FlightFormInput) => state.errors?.[key];

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <FormMessage message={state.message} />
      <FormField label={t.airline} error={error("airlineId")}>
        <select name="airlineId" defaultValue={value("airlineId")} className="input" required>
          <option value="" disabled>
            –
          </option>
          {airlines.map((airline) => (
            <option key={airline.id} value={airline.id}>
              {airline.label}
            </option>
          ))}
        </select>
      </FormField>
      <p className="-mt-2 text-sm text-neutral-600">{t.airlineHint}</p>

      <FormField label={t.stand} hint={messages.form.optional} error={error("stand")}>
        <input name="stand" defaultValue={value("stand")} maxLength={10} className="input max-w-40" />
      </FormField>

      <p className="text-sm text-neutral-600">
        {t.timeHint} {t.partsHint} {t.messagesHint}
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
          <FormField label={t.origin} hint={messages.form.optional} error={error("origin")}>
            <input name="origin" defaultValue={value("origin")} maxLength={3} className="input max-w-24 uppercase" />
          </FormField>
          <FormField label={t.registration} hint={messages.form.optional} error={error("arrivalRegistration")}>
            <input name="arrivalRegistration" defaultValue={value("arrivalRegistration")} className="input max-w-40 uppercase" />
          </FormField>
          <FormField label={t.flightDate} hint={t.flightDateHint} error={error("arrivalFlightDate")}>
            <input type="date" name="arrivalFlightDate" defaultValue={value("arrivalFlightDate")} className="input" />
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
          <FormField label={t.destination} hint={messages.form.optional} error={error("destination")}>
            <input name="destination" defaultValue={value("destination")} maxLength={3} className="input max-w-24 uppercase" />
          </FormField>
          <FormField label={t.registration} hint={messages.form.optional} error={error("departureRegistration")}>
            <input name="departureRegistration" defaultValue={value("departureRegistration")} className="input max-w-40 uppercase" />
          </FormField>
          <FormField label={t.flightDate} hint={t.flightDateHint} error={error("departureFlightDate")}>
            <input type="date" name="departureFlightDate" defaultValue={value("departureFlightDate")} className="input" />
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
