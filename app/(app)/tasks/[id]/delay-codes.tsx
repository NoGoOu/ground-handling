"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";

const t = messages.delayRecords;

export function AddDelayCodeForm({
  action,
  codes,
}: {
  action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  codes: { code: string; description: string | null }[];
}) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">{t.code}</span>
        <select name="code" className="input" required defaultValue="">
          <option value="" disabled>
            –
          </option>
          {codes.map((c) => (
            <option key={c.code} value={c.code}>
              {c.description ? `${c.code} – ${c.description}` : c.code}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">{t.minutes}</span>
        <input name="minutes" type="number" min={1} step={1} inputMode="numeric" className="input w-24" required />
      </label>
      <button type="submit" disabled={pending} className="btn btn-primary mb-0.5">
        {t.add}
      </button>
      <ActionFeedback result={result} successText={t.added} />
    </form>
  );
}

export function RemoveDelayCodeButton({ action }: { action: () => Promise<ActionResult> }) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <button
        type="submit"
        disabled={pending}
        className="btn btn-secondary py-1 text-xs"
        onClick={(event) => {
          if (!window.confirm(t.confirmRemove)) event.preventDefault();
        }}
      >
        {t.remove}
      </button>
      <ActionFeedback result={result} />
    </form>
  );
}
