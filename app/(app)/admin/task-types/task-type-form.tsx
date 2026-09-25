"use client";

import { useActionState } from "react";
import { FormField, FormMessage } from "@/components/form-field";
import { messages } from "@/lib/messages";
import type { TaskTypeFormInput } from "@/lib/validation/task-type";
import type { TaskTypeFormState } from "./actions";

const t = messages.taskTypes;

/** Name and code of a task type; the same form creates a new one. */
export function TaskTypeForm({
  action,
  initial,
  submitLabel,
}: {
  action: (state: TaskTypeFormState, formData: FormData) => Promise<TaskTypeFormState>;
  initial: TaskTypeFormInput;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (key: keyof TaskTypeFormInput) => state.values?.[key] ?? initial[key];
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <FormMessage message={state.message} notice={state.notice} />
      <div className="flex flex-wrap items-end gap-3">
        <FormField label={t.name} error={state.errors?.name}>
          <input key={value("name")} name="name" defaultValue={value("name")} className="input" required />
        </FormField>
        <FormField label={t.code} hint={t.codeHint} error={state.errors?.code}>
          <input
            key={value("code")}
            name="code"
            defaultValue={value("code")}
            className="input w-32 font-mono uppercase"
            required
          />
        </FormField>
        <button type="submit" disabled={pending} className="btn btn-primary mb-0.5">
          {pending ? messages.form.saving : submitLabel}
        </button>
      </div>
    </form>
  );
}
