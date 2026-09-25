"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";

const t = messages.planning;

export interface NameOption {
  id: string;
  name: string;
  /** Holds every qualification the position needs on the day (6. mérföldkő). */
  fits: boolean;
  /** What they lack, named, when they do not fit. */
  missing: string | null;
}

/** One agent per position of the day (CLAUDE.md, "Nevek és tervezet"). */
export function NamesForm({
  positions,
  action,
}: {
  /** Per position its agents, those who fit first (CLAUDE.md, 6. mérföldkő: a névadás sorrendje). */
  positions: { id: string; number: number; userId: string | null; shift: string; options: NameOption[] }[];
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
              <optgroup label={t.names.fitting}>
                {position.options
                  .filter((o) => o.fits)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label={t.names.notFitting}>
                {position.options
                  .filter((o) => !o.fits)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.missing ? `${o.name} – ${o.missing}` : o.name}
                    </option>
                  ))}
              </optgroup>
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
