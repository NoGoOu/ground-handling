"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";

/** Starts the attempt: with a time limit, the time runs from here. */
export function StartButton({ action }: { action: () => Promise<ActionResult> }) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <button type="submit" disabled={pending} className="btn btn-primary btn-lg self-stretch sm:self-start">
        {messages.attempts.start}
      </button>
      <ActionFeedback result={result} />
    </form>
  );
}
