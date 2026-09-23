"use client";

import { useActionState, useState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";

const t = messages.shiftForm;

type FormAction = (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;

export interface SegmentTypeOption {
  id: string;
  name: string;
  operative: boolean;
}

export interface SegmentValues {
  segmentTypeId: string;
  start: string;
  end: string;
  location: string;
  description: string;
  createBlock: boolean;
  travelBeforeMinutes: number;
  travelAfterMinutes: number;
  note: string;
}

function SegmentFields({ types, initial }: { types: SegmentTypeOption[]; initial: SegmentValues }) {
  const [typeId, setTypeId] = useState(initial.segmentTypeId);
  // A block only makes sense for a non-operative segment (CLAUDE.md).
  const operative = types.find((type) => type.id === typeId)?.operative ?? true;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">{t.segmentType}</span>
          <select
            name="segmentTypeId"
            value={typeId}
            onChange={(event) => setTypeId(event.target.value)}
            className="input py-1 text-sm"
            required
          >
            <option value="" disabled>
              –
            </option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">{t.start}</span>
          <input type="datetime-local" name="start" defaultValue={initial.start} className="input py-1 text-sm" required />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">{t.end}</span>
          <input type="datetime-local" name="end" defaultValue={initial.end} className="input py-1 text-sm" required />
        </label>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">{t.location}</span>
          <input name="location" defaultValue={initial.location} maxLength={100} className="input py-1 text-sm" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">{t.description}</span>
          <input name="description" defaultValue={initial.description} maxLength={200} className="input py-1 text-sm" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">{t.note}</span>
          <input name="note" defaultValue={initial.note} maxLength={200} className="input py-1 text-sm" />
        </label>
      </div>
      {!operative && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex items-center gap-2 py-2 text-sm">
            <input type="checkbox" name="createBlock" defaultChecked={initial.createBlock} className="size-4" />
            {t.createBlock}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-500">{t.travelBefore}</span>
            <input
              type="number"
              name="travelBeforeMinutes"
              defaultValue={initial.travelBeforeMinutes}
              min={0}
              max={480}
              className="input w-24 py-1 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-500">{t.travelAfter}</span>
            <input
              type="number"
              name="travelAfterMinutes"
              defaultValue={initial.travelAfterMinutes}
              min={0}
              max={480}
              className="input w-24 py-1 text-sm"
            />
          </label>
        </div>
      )}
    </div>
  );
}

export function SegmentForm({
  action,
  types,
  initial,
  submitLabel,
}: {
  action: FormAction;
  types: SegmentTypeOption[];
  initial: SegmentValues;
  submitLabel: string;
}) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} key={JSON.stringify(initial)} className="flex flex-col gap-2">
      <SegmentFields types={types} initial={initial} />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-secondary">
          {submitLabel}
        </button>
        <ActionFeedback result={result} successText={messages.form.saved} />
      </div>
    </form>
  );
}

/** Remove buttons for a segment or a whole shift; no form fields. */
export function RemoveButton({ action, label }: { action: FormAction; label: string }) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex items-center gap-3">
      <button type="submit" disabled={pending} className="btn btn-secondary text-red-700">
        {label}
      </button>
      <ActionFeedback result={result} />
    </form>
  );
}
