"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import type { ActionResult } from "@/lib/action";

/** A small button that runs one action, e.g. moving or removing a row of an ordered list. */
export function RowButton({ action, label, confirm }: { action: () => Promise<ActionResult>; label: string; confirm?: string }) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="inline-flex items-center gap-1">
      <button
        type="submit"
        disabled={pending}
        className="btn btn-secondary px-2 py-0.5 text-xs"
        onClick={(event) => {
          if (confirm && !window.confirm(confirm)) event.preventDefault();
        }}
      >
        {label}
      </button>
      {result?.ok === false && <ActionFeedback result={result} />}
    </form>
  );
}
