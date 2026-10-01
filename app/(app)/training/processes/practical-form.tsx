"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import { FormField } from "@/components/form-field";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";

const x = messages.practical;

function VerdictRadios({ name, labels }: { name: string; labels: Record<"PASS" | "FAIL", string> }) {
  return (
    <span className="flex flex-wrap gap-4">
      {(["PASS", "FAIL"] as const).map((verdict) => (
        <label key={verdict} className="flex min-h-11 items-center gap-2 text-base">
          <input type="radio" name={name} value={verdict} required className="size-5" />
          {labels[verdict]}
        </label>
      ))}
    </span>
  );
}

export function PracticalExamForm({
  action,
  taskParts,
  criteria,
}: {
  action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  taskParts: { value: string; label: string }[];
  criteria: { id: string; text: string }[];
}) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormField label={x.taskPart}>
        <select name="taskPart" defaultValue="" className="input" required>
          <option value="" disabled>
            {x.choose}
          </option>
          {taskParts.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FormField>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium text-neutral-700">{x.criteria}</legend>
        {criteria.length === 0 && <p className="text-sm text-neutral-600">{x.noCriteria}</p>}
        {criteria.map((criterion, index) => (
          <div key={criterion.id} className="flex flex-col gap-1 rounded-lg bg-neutral-50 p-2">
            <span className="font-medium">
              {index + 1}. {criterion.text}
            </span>
            <VerdictRadios name={`criterion_${criterion.id}`} labels={x.criterionVerdicts} />
            <input name={`note_${criterion.id}`} aria-label={x.criterionNote} placeholder={x.criterionNote} maxLength={2000} className="input" />
          </div>
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-medium text-neutral-700">{x.verdict}</legend>
        <VerdictRadios name="verdict" labels={x.verdicts} />
      </fieldset>
      <FormField label={x.feedback} hint={x.feedbackHint}>
        <textarea name="feedback" rows={2} maxLength={2000} className="input" />
      </FormField>
      <FormField label={x.internalNote} hint={x.internalHint}>
        <textarea name="internalNote" rows={2} maxLength={2000} className="input" />
      </FormField>
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary self-start"
        onClick={(event) => {
          if (!window.confirm(x.confirmSave)) event.preventDefault();
        }}
      >
        {x.save}
      </button>
      <ActionFeedback result={result} successText={x.saved} />
    </form>
  );
}
