"use client";

import { useActionState } from "react";
import { messages } from "@/lib/messages";
import type { TakeoverState } from "../actions";

const t = messages.planning.takeover;

/** "Kiosztás átvétele" of the day: fills the unassigned parts only, and says what it skipped. */
export function TakeoverButton({ action }: { action: () => Promise<TakeoverState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div>
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary"
          onClick={(event) => {
            if (!window.confirm(t.confirm)) event.preventDefault();
          }}
        >
          {pending ? messages.form.saving : t.button}
        </button>
      </div>
      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.notice && (
        <div role="status" className="flex flex-col gap-1 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <p className="font-medium">{state.notice}</p>
          {!!state.skipped?.length && (
            <>
              <p>{t.skippedTitle}</p>
              <ul className="list-disc pl-5">
                {state.skipped.map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      {!!state.conflicts?.length && (
        <div role="status" className="rounded-md bg-orange-50 px-3 py-2 text-sm text-orange-900">
          <p className="font-medium">⚠ {t.conflictsTitle}</p>
          <ul className="list-disc pl-5">
            {state.conflicts.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
