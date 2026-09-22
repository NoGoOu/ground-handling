"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import type { TaskStatus } from "@/generated/prisma/enums";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";

const STATUSES: TaskStatus[] = ["PLANNED", "IN_PROGRESS", "COMPLETED"];

/** One form for all status buttons, so the result stays visible after the status changes. */
export function StatusControl({
  current,
  action,
}: {
  current: TaskStatus;
  action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;
}) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {STATUSES.filter((s) => s !== current).map((status) => (
          <button
            key={status}
            type="submit"
            name="status"
            value={status}
            disabled={pending}
            className={`btn btn-lg ${status === "COMPLETED" ? "btn-primary" : "btn-secondary"}`}
          >
            {messages.statusAction[status]}
          </button>
        ))}
      </div>
      <ActionFeedback result={result} />
    </form>
  );
}
