"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";

/** Clears the "missing from the last import" marker of one flight. */
export function ClearMissingButton({ action }: { action: () => Promise<ActionResult> }) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex items-center gap-2">
      <button type="submit" disabled={pending} className="btn btn-secondary py-1 text-xs">
        {messages.import.missing.clear}
      </button>
      <ActionFeedback result={result} />
    </form>
  );
}
