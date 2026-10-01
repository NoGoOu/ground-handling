"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import { FormField } from "@/components/form-field";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";

const p = messages.processes;

export function StartProcessForm({
  action,
  agents,
  trainings,
}: {
  action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  agents: { id: string; name: string }[];
  trainings: { id: string; name: string; theoryPart: boolean; practicalPart: boolean }[];
}) {
  const [result, formAction, pending] = useActionState(action, null);
  if (trainings.length === 0) return <p className="text-sm text-neutral-600">{p.noTrainings}</p>;
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <FormField label={p.agent}>
        <select name="userId" defaultValue="" className="input" required>
          <option value="" disabled>
            –
          </option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label={p.training}>
        <select name="trainingId" defaultValue="" className="input" required>
          <option value="" disabled>
            –
          </option>
          {trainings.map((training) => (
            <option key={training.id} value={training.id}>
              {training.name} ({[training.theoryPart && messages.exams.parts.theory, training.practicalPart && messages.exams.parts.practical].filter(Boolean).join(" + ")})
            </option>
          ))}
        </select>
      </FormField>
      <button type="submit" disabled={pending} className="btn btn-primary mb-0.5">
        {p.start}
      </button>
      <ActionFeedback result={result} />
    </form>
  );
}

export function ReleaseButton({ action }: { action: () => Promise<ActionResult> }) {
  const [result, formAction, pending] = useActionState(action, null);
  const r = messages.release;
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary btn-lg self-start"
        onClick={(event) => {
          if (!window.confirm(r.confirm)) event.preventDefault();
        }}
      >
        {r.release}
      </button>
      <ActionFeedback result={result} successText={r.released} />
    </form>
  );
}

export function AbortProcessForm({ action }: { action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult> }) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <FormField label={p.abortReason} hint={messages.form.optional}>
        <input name="reason" maxLength={500} className="input w-80" />
      </FormField>
      <button
        type="submit"
        disabled={pending}
        className="btn btn-danger mb-0.5"
        onClick={(event) => {
          if (!window.confirm(p.confirmAbort)) event.preventDefault();
        }}
      >
        {p.abort}
      </button>
      <ActionFeedback result={result} successText={p.aborted} />
    </form>
  );
}
