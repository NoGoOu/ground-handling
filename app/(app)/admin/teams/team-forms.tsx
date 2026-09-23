"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";

const t = messages.teamForm;

type Action = (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;

export interface PersonOption {
  id: string;
  name: string;
}

function Fields({ people, initial }: { people: PersonOption[]; initial?: { name: string; leaderId: string } }) {
  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-500">{t.name}</span>
        <input name="name" defaultValue={initial?.name ?? ""} maxLength={60} className="input py-1 text-sm" required />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-500">{t.leader}</span>
        <select name="leaderId" defaultValue={initial?.leaderId ?? ""} className="input py-1 text-sm" required>
          <option value="" disabled>
            –
          </option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

export function NewTeamForm({ action, people }: { action: Action; people: PersonOption[] }) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <Fields people={people} />
        <button type="submit" disabled={pending} className="btn btn-primary">
          {t.create}
        </button>
      </div>
      <ActionFeedback result={result} />
    </form>
  );
}

export function TeamRowForm({
  action,
  people,
  initial,
  members,
}: {
  action: Action;
  people: PersonOption[];
  initial: { name: string; leaderId: string };
  members: string[];
}) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <form action={formAction} key={JSON.stringify(initial)} className="flex flex-wrap items-end gap-2">
        <Fields people={people} initial={initial} />
        <button type="submit" disabled={pending} className="btn btn-secondary">
          {messages.form.save}
        </button>
      </form>
      <p className="text-sm text-neutral-600">
        <span className="text-xs text-neutral-500">{t.members}: </span>
        {members.length > 0 ? members.join(", ") : t.noMembers}
      </p>
      <ActionFeedback result={result} successText={messages.form.saved} />
    </li>
  );
}
