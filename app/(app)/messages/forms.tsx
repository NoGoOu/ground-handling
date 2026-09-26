"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import { FormField, FormMessage } from "@/components/form-field";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";
import type { PasteState } from "./actions";

const t = messages.inbox;

export function PasteForm({ action }: { action: (state: PasteState, formData: FormData) => Promise<PasteState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-3">
        <FormMessage message={state.error} />
        <FormField label={t.text}>
          <textarea name="text" rows={12} className="input font-mono text-sm" spellCheck={false} required />
        </FormField>
        <FormField label={t.receivedAt} hint={t.receivedAtHint}>
          <input type="datetime-local" name="receivedAt" className="input max-w-64" />
        </FormField>
        <button type="submit" disabled={pending} className="btn btn-primary self-start">
          {pending ? t.processing : t.submit}
        </button>
      </form>

      {state.results && (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">{t.results}</h2>
          <ul className="flex flex-col gap-2">
            {state.results.map((result, index) => (
              <li key={index} className="flex flex-col gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm">
                <span>
                  <span className="font-mono font-semibold">{result.type}</span> · {t.status[result.status]}
                  {result.status === "stored" && !result.unmatched && !result.current && <> · {t.notCurrent}</>}
                </span>
                {result.summary &&
                  (result.flightId ? (
                    <Link href={`/flights/${result.flightId}/edit`} className="text-sky-700 hover:underline">
                      {result.summary}
                    </Link>
                  ) : (
                    <span className="text-orange-800">{result.summary}</span>
                  ))}
                {result.warnings.map((warning, i) => (
                  <span key={i} className="text-orange-700">
                    ⚠ {warning}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function AssignForm({
  action,
  options,
}: {
  action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  options: { value: string; label: string }[];
}) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <FormField label={t.unmatched.target}>
        <select name="target" className="input" required defaultValue="">
          <option value="" disabled>
            –
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FormField>
      <button type="submit" disabled={pending} className="btn btn-primary mb-0.5">
        {t.unmatched.assign}
      </button>
      <ActionFeedback result={result} successText={t.unmatched.assigned} />
    </form>
  );
}

export function DiscardButton({ action }: { action: () => Promise<ActionResult> }) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <button
        type="submit"
        disabled={pending}
        className="btn btn-secondary py-1 text-xs"
        onClick={(event) => {
          if (!window.confirm(t.unmatched.confirmDiscard)) event.preventDefault();
        }}
      >
        {t.unmatched.discard}
      </button>
      <ActionFeedback result={result} successText={t.unmatched.discardedDone} />
    </form>
  );
}
