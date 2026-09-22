"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormField, FormMessage } from "@/components/form-field";
import { messages } from "@/lib/messages";
import type { AirlineFormInput } from "@/lib/validation/airline";
import type { AirlineFormState } from "./actions";

const t = messages.airlineForm;

export function AirlineForm({
  action,
  initial,
  submitLabel,
}: {
  action: (state: AirlineFormState, formData: FormData) => Promise<AirlineFormState>;
  initial: AirlineFormInput;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (key: keyof AirlineFormInput) => state.values?.[key] ?? initial[key];

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <FormMessage message={state.message} />
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <FormField label={t.name} error={state.errors?.name}>
          <input name="name" defaultValue={value("name")} className="input" required />
        </FormField>
        <FormField label={t.iataCode} error={state.errors?.iataCode}>
          <input name="iataCode" defaultValue={value("iataCode")} maxLength={2} className="input uppercase" required />
        </FormField>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? messages.form.saving : submitLabel}
        </button>
        <Link href="/admin/airlines" className="btn btn-secondary">
          {messages.form.cancel}
        </Link>
      </div>
    </form>
  );
}
