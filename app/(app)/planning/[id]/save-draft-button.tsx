"use client";

import { useActionState } from "react";
import { messages } from "@/lib/messages";
import type { DraftSaveState } from "../actions";

const t = messages.planning.draft;

/** "Mentés a tervezetbe" for the whole plan; it replaces the plan's earlier draft shifts, so it asks first. */
export function SaveDraftButton({ action }: { action: () => Promise<DraftSaveState> }) {
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
          {pending ? messages.form.saving : t.save}
        </button>
      </div>
      {state.error && (
        <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>{state.error}</p>
          {state.conflicts && (
            <ul className="mt-1 list-disc pl-5">
              {state.conflicts.map((conflict) => (
                <li key={conflict}>{conflict}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {state.notice && (
        <div role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.notice.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}
    </form>
  );
}
