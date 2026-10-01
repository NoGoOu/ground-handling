"use client";

import { useActionState, useState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import { FormField } from "@/components/form-field";
import type { ActionResult } from "@/lib/action";
import { practicalVerdict, type Verdict } from "@/lib/exams/practical";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";

const x = messages.practical;

function VerdictRadios({
  name,
  labels,
  value,
  onChange,
  disabled,
}: {
  name: string;
  labels: Record<Verdict, string>;
  value?: Verdict | null;
  onChange?: (verdict: Verdict) => void;
  disabled?: boolean;
}) {
  return (
    <span className="flex flex-wrap gap-4">
      {(["PASS", "FAIL"] as const).map((verdict) => (
        <label key={verdict} className={`flex min-h-11 items-center gap-2 text-base ${disabled ? "opacity-60" : ""}`}>
          <input
            type="radio"
            name={name}
            value={verdict}
            required={!disabled}
            disabled={disabled}
            {...(value === undefined ? {} : { checked: value === verdict })}
            onChange={() => onChange?.(verdict)}
            className="size-5"
          />
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
  criteria: { id: string; text: string; knockOut: boolean }[];
}) {
  const [result, formAction, pending] = useActionState(action, null);
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [chosen, setChosen] = useState<Verdict | null>(null);
  // A failed knock-out criterion fails the exam; the server decides the same way.
  const judged = criteria.flatMap((criterion) =>
    verdicts[criterion.id] ? [{ text: criterion.text, verdict: verdicts[criterion.id], knockOut: criterion.knockOut }] : [],
  );
  const { verdict, forced } = practicalVerdict(judged, chosen);
  const failedNames = judged.filter((r) => r.knockOut && r.verdict === "FAIL").map((r) => r.text);

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
          <div key={criterion.id} className={`flex flex-col gap-1 rounded-lg p-2 ${criterion.knockOut ? "border border-red-200 bg-red-50/50" : "bg-neutral-50"}`}>
            <span className="font-medium">
              {index + 1}. {criterion.text}
              {criterion.knockOut && <span className="ml-2 rounded bg-red-100 px-1.5 text-xs font-semibold text-red-800">{x.knockOutTag}</span>}
            </span>
            <VerdictRadios
              name={`criterion_${criterion.id}`}
              labels={x.criterionVerdicts}
              onChange={(value) => setVerdicts((current) => ({ ...current, [criterion.id]: value }))}
            />
            <input name={`note_${criterion.id}`} aria-label={x.criterionNote} placeholder={x.criterionNote} maxLength={2000} className="input" />
          </div>
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-medium text-neutral-700">{x.verdict}</legend>
        <VerdictRadios name="verdict" labels={x.verdicts} value={forced ? verdict : chosen} onChange={setChosen} disabled={forced} />
        {forced && (
          <p role="status" className="text-sm font-medium text-red-700">
            {fmt(x.forcedFail, { names: failedNames.join(", ") })}
          </p>
        )}
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
