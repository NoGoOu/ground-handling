"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import { FormField, FormMessage } from "@/components/form-field";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";
import type { MilestoneDef } from "@/lib/turnaround";
import type { TemplateFormInput } from "@/lib/validation/template";
import type { TemplateCreateState, TemplateFormState } from "./actions";
import { milestoneGrid } from "./milestone-grid";

const t = messages.templateForm;

type Action = (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;

export function TemplateCreateForm({
  action,
}: {
  action: (state: TemplateCreateState, formData: FormData) => Promise<TemplateCreateState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-2">
      <FormMessage message={state.message} />
      <div className="flex items-end gap-2">
        <FormField label={t.newName} error={state.errors?.name}>
          <input name="name" defaultValue={state.values?.name ?? ""} className="input" required />
        </FormField>
        <button type="submit" disabled={pending} className="btn btn-primary mb-0.5">
          {t.create}
        </button>
      </div>
      <p className="text-sm text-neutral-600">{t.createHint}</p>
    </form>
  );
}

const PARAM_FIELDS = [
  "minTurnaroundMinutes",
  "travelMinutes",
  "postDepartureMinutes",
  "departureReportMinutes",
  "minBreakMinutes",
] as const;

export function TemplateParamsForm({
  action,
  initial,
}: {
  action: (state: TemplateFormState, formData: FormData) => Promise<TemplateFormState>;
  initial: TemplateFormInput;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (key: keyof TemplateFormInput) => state.values?.[key] ?? initial[key];
  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-4">
      <FormMessage message={state.message} notice={state.notice} />
      <FormField label={t.name} error={state.errors?.name}>
        <input name="name" defaultValue={value("name")} className="input max-w-sm" required />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        {PARAM_FIELDS.map((key) => (
          <FormField key={key} label={t[key]} hint={t.minutesUnit} error={state.errors?.[key]}>
            <input
              name={key}
              type="number"
              min={0}
              max={1440}
              step={1}
              defaultValue={value(key)}
              className="input max-w-32"
              required
            />
          </FormField>
        ))}
      </div>
      <div>
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? messages.form.saving : messages.form.save}
        </button>
      </div>
    </form>
  );
}

function MilestoneFields({ milestone, locked }: { milestone?: MilestoneDef; locked: boolean }) {
  return (
    <>
      <label className="flex flex-col gap-1 lg:contents">
        <span className="text-xs text-neutral-500 lg:hidden">{t.code}</span>
        <input
          name="code"
          defaultValue={milestone?.code}
          disabled={locked}
          className="input py-1 font-mono text-sm uppercase"
          required
        />
      </label>
      <label className="flex flex-col gap-1 lg:contents">
        <span className="text-xs text-neutral-500 lg:hidden">{t.milestoneName}</span>
        <input name="name" defaultValue={milestone?.name} className="input py-1 text-sm" required />
      </label>
      <label className="flex flex-col gap-1 lg:contents">
        <span className="text-xs text-neutral-500 lg:hidden">{t.anchor}</span>
        <select name="anchor" defaultValue={milestone?.anchor ?? "ARRIVAL"} disabled={locked} className="input py-1 text-sm">
          <option value="ARRIVAL">{t.anchors.ARRIVAL}</option>
          <option value="DEPARTURE">{t.anchors.DEPARTURE}</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 lg:contents">
        <span className="text-xs text-neutral-500 lg:hidden">{t.offset}</span>
        <input
          name="offsetMinutes"
          type="number"
          min={-1440}
          max={1440}
          step={1}
          defaultValue={milestone?.offsetMinutes ?? 0}
          disabled={locked}
          className="input py-1 text-sm"
          required
        />
      </label>
      <label className="flex items-center gap-2 lg:justify-center">
        <input
          type="checkbox"
          name="required"
          defaultChecked={milestone?.required ?? true}
          disabled={locked}
          className="size-5"
          aria-label={t.required}
        />
        <span className="text-sm lg:hidden">{t.required}</span>
      </label>
      <label className="flex flex-col gap-1 lg:contents">
        <span className="text-xs text-neutral-500 lg:hidden">{t.part}</span>
        <select
          name="part"
          defaultValue={milestone?.part ?? "ARRIVAL_PART"}
          disabled={locked}
          className="input py-1 text-sm"
        >
          <option value="ARRIVAL_PART">{t.parts.ARRIVAL_PART}</option>
          <option value="DEPARTURE_PART">{t.parts.DEPARTURE_PART}</option>
        </select>
      </label>
    </>
  );
}

export function MilestoneRowForm({
  milestone,
  locked,
  preview,
  isFirst,
  isLast,
  saveAction,
  moveAction,
  deleteAction,
}: {
  milestone: MilestoneDef;
  locked: boolean;
  preview: string;
  isFirst: boolean;
  isLast: boolean;
  saveAction: Action;
  moveAction: Action;
  deleteAction: Action;
}) {
  const [saveResult, save, saving] = useActionState(saveAction, null);
  const [moveResult, move, moving] = useActionState(moveAction, null);
  const [deleteResult, remove, deleting] = useActionState(deleteAction, null);
  const pending = saving || moving || deleting;
  // Show the outcome of whichever action ran last.
  const result = [deleteResult, moveResult, saveResult].find((r) => r && !r.ok) ?? saveResult;

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <form
          action={save}
          // Re-mount with fresh values when the saved milestone changes.
          key={JSON.stringify(milestone)}
          className={`flex flex-1 flex-col gap-2 ${milestoneGrid}`}
        >
          <MilestoneFields milestone={milestone} locked={locked} />
          <span className="text-sm text-neutral-600 tabular-nums lg:text-center">
            <span className="text-xs text-neutral-500 lg:hidden">{t.preview}: </span>
            {preview}
          </span>
          <button type="submit" disabled={pending} className="btn btn-secondary py-1">
            {messages.form.save}
          </button>
        </form>
        <div className="flex gap-2 lg:w-40 lg:justify-end">
          <form action={move} className="flex gap-1">
            <button
              type="submit"
              name="direction"
              value="up"
              disabled={pending || locked || isFirst}
              className="btn btn-secondary px-2 py-1"
              aria-label={t.moveUp}
              title={t.moveUp}
            >
              ↑
            </button>
            <button
              type="submit"
              name="direction"
              value="down"
              disabled={pending || locked || isLast}
              className="btn btn-secondary px-2 py-1"
              aria-label={t.moveDown}
              title={t.moveDown}
            >
              ↓
            </button>
          </form>
          <form
            action={remove}
            onSubmit={(event) => {
              if (!confirm(t.confirmDelete)) event.preventDefault();
            }}
          >
            <button type="submit" disabled={pending || locked} className="btn btn-danger py-1">
              {t.delete}
            </button>
          </form>
        </div>
      </div>
      <ActionFeedback result={result} successText={result === saveResult ? messages.form.saved : undefined} />
    </li>
  );
}

export function AddMilestoneForm({ action }: { action: Action }) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form
      action={formAction}
      className="flex flex-col gap-2 rounded-xl border border-dashed border-neutral-300 bg-white p-4"
    >
      <h3 className="font-semibold">{t.add}</h3>
      <div className={`flex flex-col gap-2 ${milestoneGrid}`}>
        <MilestoneFields locked={false} />
        <span />
        <button type="submit" disabled={pending} className="btn btn-primary py-1">
          {t.addButton}
        </button>
      </div>
      <ActionFeedback result={result} />
    </form>
  );
}
