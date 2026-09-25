"use client";

import { useActionState, useState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import { FormField, FormMessage } from "@/components/form-field";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";
import type { CourseFormInput, QualificationFormInput, RecordFormInput } from "@/lib/validation/training";
import type { CourseFormState, QualificationFormState, RecordFormState } from "./actions";

// The coordinator's forms (CLAUDE.md, 6. mérföldkő).

const t = messages.training;

export function QualificationForm({
  action,
  initial,
  submitLabel,
}: {
  action: (state: QualificationFormState, formData: FormData) => Promise<QualificationFormState>;
  initial: QualificationFormInput;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (key: keyof QualificationFormInput) => state.values?.[key] ?? initial[key];
  const q = t.qualifications;
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <FormMessage message={state.message} notice={state.notice} />
      <div className="flex flex-wrap items-end gap-3">
        <FormField label={q.name} error={state.errors?.name}>
          <input key={`n${value("name")}`} name="name" defaultValue={value("name")} className="input" required />
        </FormField>
        <FormField label={q.code} error={state.errors?.code}>
          <input key={`c${value("code")}`} name="code" defaultValue={value("code")} className="input w-28 font-mono uppercase" required />
        </FormField>
        <FormField label={q.validityMonths} hint={q.validityHint} error={state.errors?.validityMonths}>
          <input
            key={`m${value("validityMonths")}`}
            name="validityMonths"
            type="number"
            min={1}
            max={600}
            defaultValue={value("validityMonths")}
            className="input w-28"
          />
        </FormField>
        <label className="mb-2 flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={value("active") === "on"} className="size-5" />
          {q.active}
        </label>
        <button type="submit" disabled={pending} className="btn btn-primary mb-0.5">
          {pending ? messages.form.saving : submitLabel}
        </button>
      </div>
    </form>
  );
}

export function CourseForm({
  action,
  initial,
  qualifications,
  submitLabel,
}: {
  action: (state: CourseFormState, formData: FormData) => Promise<CourseFormState>;
  initial: CourseFormInput;
  /** Active ones, and the course's own even when inactive. */
  qualifications: { id: string; code: string; name: string }[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (key: keyof CourseFormInput) => state.values?.[key] ?? initial[key];
  const [hasExam, setHasExam] = useState(value("hasExam") === "on");
  const c = t.courses;
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <FormMessage message={state.message} notice={state.notice} />
      <div className="flex flex-wrap items-end gap-3">
        <FormField label={c.name} error={state.errors?.name}>
          <input key={`n${value("name")}`} name="name" defaultValue={value("name")} className="input" required />
        </FormField>
        <FormField label={c.qualification} error={state.errors?.qualificationId}>
          <select key={`q${value("qualificationId")}`} name="qualificationId" defaultValue={value("qualificationId")} className="input">
            <option value="">{c.noQualification}</option>
            {qualifications.map((q) => (
              <option key={q.id} value={q.id}>
                {q.code} – {q.name}
              </option>
            ))}
          </select>
        </FormField>
        <label className="mb-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="hasExam"
            checked={hasExam}
            onChange={(event) => setHasExam(event.target.checked)}
            className="size-5"
          />
          {c.hasExam}
        </label>
        {hasExam && (
          <FormField label={c.passPercent} hint={c.percentUnit} error={state.errors?.passPercent}>
            <input name="passPercent" type="number" min={0} max={100} defaultValue={value("passPercent")} className="input w-24" required />
          </FormField>
        )}
        <button type="submit" disabled={pending} className="btn btn-primary mb-0.5">
          {pending ? messages.form.saving : submitLabel}
        </button>
      </div>
    </form>
  );
}

export interface CourseOption {
  id: string;
  name: string;
  hasExam: boolean;
  givesQualification: boolean;
}

export function RecordForm({
  action,
  initial,
  people,
  courses,
  fixedPerson,
  submitLabel,
}: {
  action: (state: RecordFormState, formData: FormData) => Promise<RecordFormState>;
  initial: RecordFormInput;
  /** Offered on a new record; a saved record keeps its person (approved decision 5). */
  people: { id: string; name: string }[];
  courses: CourseOption[];
  fixedPerson?: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (key: keyof RecordFormInput) => state.values?.[key] ?? initial[key];
  const [courseId, setCourseId] = useState(value("trainingId"));
  const [manual, setManual] = useState(value("validUntilManual") === "on");
  const course = courses.find((c) => c.id === courseId);
  const r = t.records;
  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-4">
      <FormMessage message={state.message} notice={state.notice} />
      <div className="grid gap-4 sm:grid-cols-2">
        {fixedPerson ? (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-neutral-700">{r.person}</span>
            <span className="font-medium">{fixedPerson}</span>
          </div>
        ) : (
          <FormField label={r.person} error={state.errors?.userId}>
            <select name="userId" defaultValue={value("userId")} className="input" required>
              <option value="" disabled>
                –
              </option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </FormField>
        )}
        <FormField label={r.course} error={state.errors?.trainingId}>
          <select
            name="trainingId"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            className="input"
            required
          >
            <option value="" disabled>
              –
            </option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={r.completedOn} error={state.errors?.completedOn}>
          <input name="completedOn" type="date" defaultValue={value("completedOn")} className="input w-auto" required />
        </FormField>
        {course?.hasExam ? (
          <FormField label={r.examPercent} hint="%" error={state.errors?.examPercent}>
            <input name="examPercent" type="number" min={0} max={100} defaultValue={value("examPercent")} className="input w-28" required />
          </FormField>
        ) : (
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="passed" defaultChecked={value("passed") === "on"} className="size-5" />
              {r.passed}
            </label>
            <span className="text-xs text-neutral-500">{r.passedHint}</span>
            {state.errors?.examPercent && <span className="text-sm text-red-700">{state.errors.examPercent}</span>}
          </div>
        )}
      </div>
      {course?.givesQualification && (
        <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="validUntilManual"
              checked={manual}
              onChange={(event) => setManual(event.target.checked)}
              className="size-5"
            />
            {r.validUntilManual}
          </label>
          <span className="text-xs text-neutral-500">{r.validUntilHint}</span>
          {manual && (
            <FormField label={r.validUntil} error={state.errors?.validUntil}>
              <input name="validUntil" type="date" defaultValue={value("validUntil")} className="input w-auto" />
            </FormField>
          )}
        </div>
      )}
      <FormField label={r.note} hint={messages.form.optional} error={state.errors?.note}>
        <textarea name="note" defaultValue={value("note")} maxLength={500} rows={2} className="input" />
      </FormField>
      <div>
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? messages.form.saving : submitLabel}
        </button>
      </div>
    </form>
  );
}

export function FileUploadForm({ action }: { action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult> }) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="text-sm" required />
        <button type="submit" disabled={pending} className="btn btn-secondary">
          {pending ? messages.form.saving : t.files.upload}
        </button>
      </div>
      <span className="text-xs text-neutral-500">{t.files.uploadHint}</span>
      <ActionFeedback result={result} successText={t.files.done} />
    </form>
  );
}

export function RemoveFileButton({ action }: { action: () => Promise<ActionResult> }) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <button
        type="submit"
        disabled={pending}
        className="btn btn-secondary py-1 text-xs"
        onClick={(event) => {
          if (!window.confirm(t.files.confirmRemove)) event.preventDefault();
        }}
      >
        {t.files.remove}
      </button>
      <ActionFeedback result={result} />
    </form>
  );
}
