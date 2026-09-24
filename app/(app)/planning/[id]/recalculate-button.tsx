"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";

/** Recalculating overwrites manual moves and names, so it asks first (CLAUDE.md, "A terv"). */
export function RecalculateButton({
  action,
  label,
  confirmText,
}: {
  action: () => Promise<ActionResult>;
  label: string;
  confirmText: string;
}) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex items-center gap-2">
      <button
        type="submit"
        disabled={pending}
        className="btn btn-secondary"
        onClick={(event) => {
          if (!window.confirm(confirmText)) event.preventDefault();
        }}
      >
        {label}
      </button>
      <ActionFeedback result={result} successText={messages.planning.plan.recalculated} />
    </form>
  );
}
