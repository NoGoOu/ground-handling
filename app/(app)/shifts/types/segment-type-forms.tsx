"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";

const t = messages.segmentTypeForm;

type Action = (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;

export interface SegmentTypeValues {
  name: string;
  code: string;
  operative: boolean;
  active: boolean;
}

function Fields({ initial }: { initial?: SegmentTypeValues }) {
  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-500">{t.name}</span>
        <input name="name" defaultValue={initial?.name ?? ""} maxLength={60} className="input py-1 text-sm" required />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-500">{t.code}</span>
        <input
          name="code"
          defaultValue={initial?.code ?? ""}
          maxLength={10}
          className="input w-28 py-1 text-sm uppercase"
          required
        />
      </label>
      <label className="flex items-center gap-2 py-2 text-sm">
        <input type="checkbox" name="operative" defaultChecked={initial?.operative ?? true} className="size-4" />
        {t.operative}
      </label>
      <label className="flex items-center gap-2 py-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={initial?.active ?? true} className="size-4" />
        {t.active}
      </label>
    </>
  );
}

export function NewSegmentTypeForm({ action }: { action: Action }) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3">
        <Fields />
        <button type="submit" disabled={pending} className="btn btn-primary">
          {t.create}
        </button>
      </div>
      <ActionFeedback result={result} />
    </form>
  );
}

export function SegmentTypeRowForm({
  action,
  initial,
  usage,
}: {
  action: Action;
  initial: SegmentTypeValues;
  usage: string;
}) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <form action={formAction} key={JSON.stringify(initial)} className="flex flex-wrap items-end gap-3">
        <Fields initial={initial} />
        <span className="py-2 text-sm text-neutral-500">{usage}</span>
        <button type="submit" disabled={pending} className="btn btn-secondary">
          {messages.form.save}
        </button>
      </form>
      <ActionFeedback result={result} successText={messages.form.saved} />
    </li>
  );
}
