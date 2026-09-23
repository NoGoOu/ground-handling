"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";

const t = messages.publish;

export function PublishForm({
  action,
  defaultStart,
  defaultEnd,
}: {
  action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  defaultStart: string;
  defaultEnd: string;
}) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-dashed border-neutral-300 bg-white p-4">
      <h2 className="font-semibold">{t.title}</h2>
      <p className="text-sm text-neutral-600">{t.hint}</p>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">{t.start}</span>
          <input type="date" name="start" defaultValue={defaultStart} className="input w-auto py-1 text-sm" required />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">{t.end}</span>
          <input type="date" name="end" defaultValue={defaultEnd} className="input w-auto py-1 text-sm" required />
        </label>
        <button type="submit" disabled={pending} className="btn btn-primary">
          {t.submit}
        </button>
      </form>
      <ActionFeedback result={result} successText={t.done} />
    </section>
  );
}
