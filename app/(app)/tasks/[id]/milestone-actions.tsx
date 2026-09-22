"use client";

import { useActionState, useState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";

const t = messages.task;

type Action = (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;

/** "Most" button for a new record, and a manual time input for new records and corrections. */
export function MilestoneActions({
  recordNowAction,
  setTimeAction,
  hasRecord,
  defaultTime,
}: {
  recordNowAction: Action;
  setTimeAction: Action;
  hasRecord: boolean;
  defaultTime: string;
}) {
  const [nowResult, nowAction, nowPending] = useActionState(recordNowAction, null);
  const [setResult, setAction, setPending] = useActionState(setTimeAction, null);
  const [editing, setEditing] = useState(false);
  const pending = nowPending || setPending;
  const lastResult = setResult ?? nowResult;

  return (
    <div className="flex flex-col gap-2">
      {!editing && (
        <div className="flex gap-2">
          {!hasRecord && (
            <form action={nowAction} className="flex-1 sm:flex-none">
              <button type="submit" disabled={pending} className="btn btn-primary btn-lg w-full min-w-24">
                {t.now}
              </button>
            </form>
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={pending}
            className={`btn btn-secondary btn-lg ${hasRecord ? "flex-1 sm:flex-none" : ""}`}
          >
            {hasRecord ? t.correct : t.manual}
          </button>
        </div>
      )}
      {editing && (
        <form
          action={setAction}
          onSubmit={() => setEditing(false)}
          className="flex flex-wrap items-end gap-2"
        >
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-500">{t.timeInput}</span>
            <input type="datetime-local" name="time" defaultValue={defaultTime} required className="input" />
          </label>
          <button type="submit" disabled={pending} className="btn btn-primary btn-lg">
            {t.saveTime}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="btn btn-secondary btn-lg">
            {messages.form.cancel}
          </button>
        </form>
      )}
      <ActionFeedback result={lastResult} />
    </div>
  );
}
