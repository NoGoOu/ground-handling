"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import { FormField } from "@/components/form-field";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";

const o = messages.ojt;

export function AddTraineeForm({
  action,
  candidates,
}: {
  action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  candidates: { id: string; label: string }[];
}) {
  const [result, formAction, pending] = useActionState(action, null);
  if (candidates.length === 0) return <p className="text-sm text-neutral-600">{o.noCandidates}</p>;
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <FormField label={o.process}>
        <select name="processId" defaultValue="" className="input" required>
          <option value="" disabled>
            {o.choose}
          </option>
          {candidates.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.label}
            </option>
          ))}
        </select>
      </FormField>
      <button type="submit" disabled={pending} className="btn btn-secondary mb-0.5">
        {o.add}
      </button>
      <ActionFeedback result={result} successText={o.added} />
    </form>
  );
}

export function RemoveTraineeButton({ action }: { action: () => Promise<ActionResult> }) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <button
        type="submit"
        disabled={pending}
        className="btn btn-secondary py-1 text-xs"
        onClick={(event) => {
          if (!window.confirm(o.confirmRemove)) event.preventDefault();
        }}
      >
        {o.remove}
      </button>
      <ActionFeedback result={result} />
    </form>
  );
}

export function EvaluateForm({ action }: { action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult> }) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg bg-neutral-50 p-3">
      <fieldset className="flex flex-wrap gap-4">
        <legend className="mb-1 text-sm font-medium text-neutral-700">{o.verdict}</legend>
        {(["PASS", "FAIL"] as const).map((verdict) => (
          <label key={verdict} className="flex min-h-11 items-center gap-2 text-base">
            <input type="radio" name="verdict" value={verdict} required className="size-5" />
            {o.verdicts[verdict]}
          </label>
        ))}
      </fieldset>
      <FormField label={o.comment} hint={messages.form.optional}>
        <textarea name="comment" rows={2} maxLength={2000} className="input" />
      </FormField>
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary self-start"
        onClick={(event) => {
          if (!window.confirm(o.confirmEvaluate)) event.preventDefault();
        }}
      >
        {o.evaluate}
      </button>
      <ActionFeedback result={result} successText={o.evaluated} />
    </form>
  );
}
