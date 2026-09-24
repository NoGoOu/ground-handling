"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";

const t = messages.planning;

/** One agent per position of the day (CLAUDE.md, "Nevek és tervezet"). */
export function NamesForm({
  positions,
  agents,
  action,
}: {
  positions: { id: string; number: number; userId: string | null; shift: string }[];
  agents: { id: string; name: string }[];
  action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;
}) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {positions.map((position) => (
          <label key={position.id} className="flex flex-col gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-2">
            <span className="text-sm font-medium">
              {fmt(t.plan.position, { number: position.number })}
              <span className="ml-2 font-normal text-neutral-500 tabular-nums">{position.shift}</span>
            </span>
            <select name={`agent:${position.id}`} defaultValue={position.userId ?? ""} className="input">
              <option value="">{t.names.none}</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-secondary">
          {pending ? messages.form.saving : t.names.save}
        </button>
        <ActionFeedback result={result} successText={t.names.saved} />
      </div>
    </form>
  );
}
