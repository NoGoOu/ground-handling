"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import { FormField } from "@/components/form-field";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";

const f = messages.faults;

export function CloseFaultForm({
  action,
  outOfService,
}: {
  action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  /** Whether the equipment is out of service now: then it can be set back right here. */
  outOfService: boolean;
}) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <fieldset className="flex flex-wrap gap-4">
        <legend className="mb-1 text-sm font-medium text-neutral-700">{f.resolution}</legend>
        {(["FIXED", "NOT_A_FAULT"] as const).map((resolution) => (
          <label key={resolution} className="flex min-h-11 items-center gap-2 text-base">
            <input type="radio" name="resolution" value={resolution} required className="size-5" />
            {f.resolutions[resolution]}
          </label>
        ))}
      </fieldset>
      {outOfService && (
        <label className="flex min-h-11 items-center gap-2 text-base" title={f.restoreHint}>
          <input type="checkbox" name="restore" className="size-5" />
          {f.restore}
        </label>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary self-start"
        onClick={(event) => {
          if (!window.confirm(f.confirmClose)) event.preventDefault();
        }}
      >
        {f.close}
      </button>
      <ActionFeedback result={result} successText={f.closedDone} />
    </form>
  );
}

export function CommentForm({ action }: { action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult> }) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <FormField label={f.comment}>
        <textarea key={result?.ok ? "sent" : "draft"} name="text" rows={2} maxLength={2000} className="input" required />
      </FormField>
      <button type="submit" disabled={pending} className="btn btn-secondary self-start">
        {f.addComment}
      </button>
      <ActionFeedback result={result} successText={f.commentAdded} />
    </form>
  );
}
