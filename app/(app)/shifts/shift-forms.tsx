"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import type { AgentOption } from "@/app/(app)/flights/assignment-form";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";

const t = messages.shiftForm;

type Action = (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;

export const shiftGrid = "sm:grid sm:grid-cols-[minmax(9rem,1fr)_13rem_13rem_minmax(8rem,1fr)_auto] sm:items-end sm:gap-2";

function ShiftFields({
  agents,
  initial,
}: {
  agents: AgentOption[];
  initial?: { userId: string; startsAt: string; endsAt: string; note: string };
}) {
  const field = (label: string, input: React.ReactNode) => (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-neutral-500">{label}</span>
      {input}
    </label>
  );
  return (
    <>
      {field(
        t.agent,
        <select name="userId" defaultValue={initial?.userId ?? ""} className="input py-1 text-sm" required>
          <option value="" disabled>
            –
          </option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id} disabled={!agent.active}>
              {agent.name} {agent.active ? "" : messages.assignment.inactive}
            </option>
          ))}
        </select>,
      )}
      {field(
        t.startsAt,
        <input
          type="datetime-local"
          name="startsAt"
          defaultValue={initial?.startsAt ?? ""}
          className="input py-1 text-sm"
          required
        />,
      )}
      {field(
        t.endsAt,
        <input
          type="datetime-local"
          name="endsAt"
          defaultValue={initial?.endsAt ?? ""}
          className="input py-1 text-sm"
          required
        />,
      )}
      {field(
        t.note,
        <input name="note" defaultValue={initial?.note ?? ""} maxLength={200} className="input py-1 text-sm" />,
      )}
    </>
  );
}

export function NewShiftForm({ action, agents, day }: { action: Action; agents: AgentOption[]; day: string }) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-xl border border-dashed border-neutral-300 bg-white p-4">
      <h2 className="font-semibold">{t.newTitle}</h2>
      <div className={`flex flex-col gap-2 ${shiftGrid}`}>
        <ShiftFields agents={agents} initial={{ userId: "", startsAt: `${day}T06:00`, endsAt: `${day}T14:00`, note: "" }} />
        <button type="submit" disabled={pending} className="btn btn-primary">
          {t.add}
        </button>
      </div>
      <p className="text-sm text-neutral-600">{t.hint}</p>
      <ActionFeedback result={result} />
    </form>
  );
}

export function ShiftRowForm({
  saveAction,
  deleteAction,
  agents,
  initial,
}: {
  saveAction: Action;
  deleteAction: Action;
  agents: AgentOption[];
  initial: { userId: string; startsAt: string; endsAt: string; note: string };
}) {
  const [saveResult, save, saving] = useActionState(saveAction, null);
  const [deleteResult, remove, deleting] = useActionState(deleteAction, null);
  const pending = saving || deleting;
  const result = deleteResult && !deleteResult.ok ? deleteResult : saveResult;

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <form action={save} key={JSON.stringify(initial)} className={`flex flex-1 flex-col gap-2 ${shiftGrid}`}>
          <ShiftFields agents={agents} initial={initial} />
          <button type="submit" disabled={pending} className="btn btn-secondary">
            {messages.form.save}
          </button>
        </form>
        <form
          action={remove}
          onSubmit={(event) => {
            if (!confirm(t.confirmDelete)) event.preventDefault();
          }}
        >
          <button type="submit" disabled={pending} className="btn btn-danger">
            {t.delete}
          </button>
        </form>
      </div>
      <ActionFeedback result={result} successText={result === saveResult ? messages.form.saved : undefined} />
    </li>
  );
}
