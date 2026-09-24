"use client";

import { useActionState } from "react";
import { FormField, FormMessage } from "@/components/form-field";
import { messages } from "@/lib/messages";
import type { PlanFormState } from "./actions";

const t = messages.planning.create;

export function CreatePlanForm({
  action,
  defaultStart,
  defaultEnd,
}: {
  action: (state: PlanFormState, formData: FormData) => Promise<PlanFormState>;
  defaultStart: string;
  defaultEnd: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormMessage message={state.message} />
      <div className="flex flex-wrap items-end gap-3">
        <FormField label={t.start} error={state.errors?.start}>
          <input name="start" type="date" defaultValue={state.values?.start ?? defaultStart} className="input w-auto" required />
        </FormField>
        <FormField label={t.end} error={state.errors?.end}>
          <input name="end" type="date" defaultValue={state.values?.end ?? defaultEnd} className="input w-auto" required />
        </FormField>
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? t.pending : t.submit}
        </button>
      </div>
      <p className="text-sm text-neutral-600">{t.hint}</p>
    </form>
  );
}
