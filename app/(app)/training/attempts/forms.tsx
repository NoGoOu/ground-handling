"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import { FormField } from "@/components/form-field";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";

const a = messages.attempts;

export function OpenAttemptForm({
  action,
  sheets,
}: {
  action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  sheets: { id: string; name: string }[];
}) {
  const [result, formAction, pending] = useActionState(action, null);
  if (sheets.length === 0) return <p className="text-sm text-neutral-600">{a.noSheets}</p>;
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <FormField label={a.sheet}>
        <select name="sheetId" defaultValue={sheets[0].id} className="input">
          {sheets.map((sheet) => (
            <option key={sheet.id} value={sheet.id}>
              {sheet.name}
            </option>
          ))}
        </select>
      </FormField>
      <button type="submit" disabled={pending} className="btn btn-primary mb-0.5">
        {a.open}
      </button>
      <ActionFeedback result={result} />
    </form>
  );
}

export function GradeForm({
  action,
  max,
  points,
  note,
}: {
  action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  max: number;
  points: number | null;
  note: string | null;
}) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-lg bg-neutral-50 p-2">
      <FormField label={fmt(a.gradePoints, { max })}>
        <input name="points" type="number" min={0} max={max} step="any" defaultValue={points ?? ""} className="input w-24" required />
      </FormField>
      <FormField label={a.graderNote} hint={messages.form.optional}>
        <input name="note" defaultValue={note ?? ""} maxLength={2000} className="input w-72" />
      </FormField>
      <button type="submit" disabled={pending} className="btn btn-secondary mb-0.5">
        {a.gradeSave}
      </button>
      <ActionFeedback result={result} successText={a.graded} />
    </form>
  );
}

export function NotesForm({
  action,
  feedback,
  internalNote,
}: {
  action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  feedback: string | null;
  internalNote: string | null;
}) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormField label={a.feedback} hint={a.feedbackHint}>
        <textarea name="feedback" defaultValue={feedback ?? ""} rows={3} maxLength={2000} className="input" />
      </FormField>
      <FormField label={a.internalNote} hint={a.internalHint}>
        <textarea name="internalNote" defaultValue={internalNote ?? ""} rows={3} maxLength={2000} className="input" />
      </FormField>
      <button type="submit" disabled={pending} className="btn btn-secondary self-start">
        {messages.form.save}
      </button>
      <ActionFeedback result={result} successText={a.notesSaved} />
    </form>
  );
}
