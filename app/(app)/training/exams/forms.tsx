"use client";

import { useActionState, useState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import { FormField, FormMessage } from "@/components/form-field";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { OPTION_ROWS, type CriterionFormInput, type PartsFormInput, type QuestionFormInput, type SheetFormInput } from "@/lib/validation/exams";
import type { CriterionFormState, PartsFormState, QuestionFormState, SheetFormState } from "./actions";

const e = messages.exams;

export function QuestionForm({
  action,
  initial,
  submitLabel,
}: {
  action: (state: QuestionFormState, formData: FormData) => Promise<QuestionFormState>;
  initial: QuestionFormInput;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (key: keyof QuestionFormInput) => state.values?.[key] ?? initial[key];
  const [kind, setKind] = useState(value("kind"));
  const q = e.questions;
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormMessage message={state.message} notice={state.notice} />
      <FormField label={q.text} error={state.errors?.text}>
        <textarea name="text" defaultValue={value("text")} rows={3} maxLength={2000} className="input" required />
      </FormField>
      <div className="flex flex-wrap items-end gap-3">
        <FormField label={q.kind} error={state.errors?.kind}>
          <select name="kind" value={kind} onChange={(event) => setKind(event.target.value)} className="input">
            {(["SINGLE", "MULTIPLE", "TEXT"] as const).map((k) => (
              <option key={k} value={k}>
                {q.kinds[k]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={q.points} error={state.errors?.points}>
          <input name="points" type="number" min={1} max={100} defaultValue={value("points")} className="input w-24" required />
        </FormField>
        <FormField label={q.topic} hint={messages.form.optional} error={state.errors?.topic}>
          <input name="topic" defaultValue={value("topic")} maxLength={60} className="input w-48" />
        </FormField>
        <label className="mb-2 flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={value("active") === "on"} className="size-5" />
          {q.active}
        </label>
      </div>
      {kind !== "TEXT" && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-neutral-700">{q.options}</legend>
          <p className="text-xs text-neutral-500">{q.optionsHint}</p>
          {Array.from({ length: OPTION_ROWS }, (_, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                name={`option${i}`}
                aria-label={fmt(q.option, { n: i + 1 })}
                placeholder={fmt(q.option, { n: i + 1 })}
                defaultValue={value(`option${i}` as keyof QuestionFormInput)}
                maxLength={500}
                className="input flex-1"
              />
              <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                <input
                  type={kind === "SINGLE" ? "radio" : "checkbox"}
                  // A single right answer is one radio group; its value names the row.
                  name={kind === "SINGLE" ? "correctSingle" : `correct${i}`}
                  value={kind === "SINGLE" ? String(i) : "on"}
                  defaultChecked={
                    kind === "SINGLE" && value("correctSingle") !== ""
                      ? value("correctSingle") === String(i)
                      : value(`correct${i}` as keyof QuestionFormInput) === "on"
                  }
                  className="size-5"
                />
                {q.correct}
              </label>
            </div>
          ))}
          {state.errors?.options && (
            <p role="alert" className="text-sm text-red-700">
              {state.errors.options}
            </p>
          )}
        </fieldset>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary self-start">
        {pending ? messages.form.saving : submitLabel}
      </button>
    </form>
  );
}

export function SheetForm({
  action,
  initial,
  trainings,
  submitLabel,
}: {
  action: (state: SheetFormState, formData: FormData) => Promise<SheetFormState>;
  initial: SheetFormInput;
  trainings: { id: string; name: string; passPercent: number | null }[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (key: keyof SheetFormInput) => state.values?.[key] ?? initial[key];
  const s = e.sheets;
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormMessage message={state.message} notice={state.notice} />
      <div className="flex flex-wrap items-end gap-3">
        <FormField label={s.name} error={state.errors?.name}>
          <input name="name" defaultValue={value("name")} maxLength={100} className="input w-64" required />
        </FormField>
        <FormField label={s.training} error={state.errors?.trainingId}>
          <select name="trainingId" defaultValue={value("trainingId")} className="input" required>
            <option value="" disabled>
              –
            </option>
            {trainings.map((training) => (
              <option key={training.id} value={training.id}>
                {training.name} ({training.passPercent}%)
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={s.timeLimit} hint={s.timeLimitHint} error={state.errors?.timeLimitMinutes}>
          <input name="timeLimitMinutes" type="number" min={1} max={600} defaultValue={value("timeLimitMinutes")} className="input w-24" />
        </FormField>
        <label className="mb-2 flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={value("active") === "on"} className="size-5" />
          {s.active}
        </label>
      </div>
      <FormField label={s.scoring} error={state.errors?.multipleScoring}>
        <select name="multipleScoring" defaultValue={value("multipleScoring")} className="input">
          {(["ALL_OR_NOTHING", "PROPORTIONAL"] as const).map((scoring) => (
            <option key={scoring} value={scoring}>
              {s.scorings[scoring]}
            </option>
          ))}
        </select>
      </FormField>
      <button type="submit" disabled={pending} className="btn btn-primary self-start">
        {pending ? messages.form.saving : submitLabel}
      </button>
    </form>
  );
}

export function AddSheetQuestionForm({
  action,
  questions,
}: {
  action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  questions: { id: string; label: string }[];
}) {
  const [result, formAction, pending] = useActionState(action, null);
  const s = e.sheets;
  if (questions.length === 0) return <p className="text-sm text-neutral-600">{s.noMoreQuestions}</p>;
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <select name="questionId" defaultValue="" className="input max-w-xl flex-1" required>
        <option value="" disabled>
          {s.chooseQuestion}
        </option>
        {questions.map((question) => (
          <option key={question.id} value={question.id}>
            {question.label}
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending} className="btn btn-secondary">
        {s.addQuestion}
      </button>
      <ActionFeedback result={result} />
    </form>
  );
}

/** A small button that runs one action, e.g. moving or removing a row. */
export function RowButton({ action, label, confirm }: { action: () => Promise<ActionResult>; label: string; confirm?: string }) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="inline-flex items-center gap-1">
      <button
        type="submit"
        disabled={pending}
        className="btn btn-secondary px-2 py-0.5 text-xs"
        onClick={(event) => {
          if (confirm && !window.confirm(confirm)) event.preventDefault();
        }}
      >
        {label}
      </button>
      {result?.ok === false && <ActionFeedback result={result} />}
    </form>
  );
}

export function PartsForm({
  action,
  initial,
  canTheory,
}: {
  action: (state: PartsFormState, formData: FormData) => Promise<PartsFormState>;
  initial: PartsFormInput;
  /** Whether the training has an exam with a pass mark. */
  canTheory: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (key: keyof PartsFormInput) => state.values?.[key] ?? initial[key];
  const c = e.course;
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormMessage message={state.message} notice={state.notice} />
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="theoryPart" defaultChecked={value("theoryPart") === "on"} disabled={!canTheory && value("theoryPart") !== "on"} className="size-5" />
          {c.theoryPart}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="practicalPart" defaultChecked={value("practicalPart") === "on"} className="size-5" />
          {c.practicalPart}
        </label>
        {state.errors?.theoryPart && (
          <p role="alert" className="text-sm text-red-700">
            {state.errors.theoryPart}
          </p>
        )}
      </div>
      <h3 className="font-semibold">{c.ojtTitle}</h3>
      <div className="flex flex-wrap items-end gap-3">
        <FormField label={c.requiredCount} error={state.errors?.ojtRequiredCount}>
          <input name="ojtRequiredCount" type="number" min={1} max={200} defaultValue={value("ojtRequiredCount")} className="input w-24" required />
        </FormField>
        <FormField label={c.minCompleteness} hint={c.percentHint} error={state.errors?.ojtMinCompletenessPercent}>
          <input
            name="ojtMinCompletenessPercent"
            type="number"
            min={0}
            max={100}
            defaultValue={value("ojtMinCompletenessPercent")}
            className="input w-24"
            required
          />
        </FormField>
        <FormField label={c.minOnTime} hint={c.percentHint} error={state.errors?.ojtMinOnTimePercent}>
          <input name="ojtMinOnTimePercent" type="number" min={0} max={100} defaultValue={value("ojtMinOnTimePercent")} className="input w-24" required />
        </FormField>
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary self-start">
        {pending ? messages.form.saving : messages.form.save}
      </button>
    </form>
  );
}

export function CriterionForm({
  action,
  initial,
  submitLabel,
  withActive,
}: {
  action: (state: CriterionFormState, formData: FormData) => Promise<CriterionFormState>;
  initial: CriterionFormInput;
  submitLabel: string;
  /** Only an existing criterion can be made inactive. */
  withActive: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (key: keyof CriterionFormInput) => state.values?.[key] ?? initial[key];
  const c = e.course;
  return (
    <form action={formAction} className="flex flex-1 flex-col gap-1">
      <FormMessage message={state.message} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          key={value("text")}
          name="text"
          aria-label={c.criterion}
          defaultValue={value("text")}
          maxLength={300}
          className="input min-w-64 flex-1"
          required
        />
        <label className="flex items-center gap-1 text-sm" title={c.knockOutHint}>
          <input key={`k${value("knockOut")}`} type="checkbox" name="knockOut" defaultChecked={value("knockOut") === "on"} className="size-5" />
          {c.knockOut}
        </label>
        {withActive && (
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" name="active" defaultChecked={value("active") === "on"} className="size-5" />
            {c.criterionActive}
          </label>
        )}
        <button type="submit" disabled={pending} className="btn btn-secondary py-1 text-sm">
          {submitLabel}
        </button>
      </div>
      {state.errors?.text && <span className="text-sm text-red-700">{state.errors.text}</span>}
    </form>
  );
}
