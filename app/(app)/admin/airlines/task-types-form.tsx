"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";

const t = messages.taskTypes;

export interface AirlineTaskTypeOption {
  taskType: { id: string; name: string; code: string };
  /** The airline's templates of this task type. */
  templates: { id: string; name: string }[];
  templateId: string | null;
  active: boolean;
  isPrimary: boolean;
  /** The qualification ids each part needs (6. mérföldkő). */
  requirements: Record<"ARRIVAL_PART" | "DEPARTURE_PART", string[]>;
}

function RequirementCell({
  taskTypeId,
  part,
  qualifications,
  checked,
  disabled,
}: {
  taskTypeId: string;
  part: "ARRIVAL_PART" | "DEPARTURE_PART";
  qualifications: { id: string; code: string; name: string }[];
  checked: string[];
  disabled: boolean;
}) {
  return (
    <td className="px-3 py-2">
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {qualifications.map((q) => (
          <label key={q.id} className="flex items-center gap-1 text-xs" title={q.name}>
            <input
              type="checkbox"
              name={`req:${taskTypeId}:${part}`}
              value={q.id}
              defaultChecked={checked.includes(q.id)}
              disabled={disabled}
              className="size-4"
            />
            <span className="font-mono">{q.code}</span>
          </label>
        ))}
      </div>
    </td>
  );
}

/** An airline's task types: template, active and primary per type (CLAUDE.md, 5. mérföldkő). */
export function AirlineTaskTypesForm({
  action,
  rows,
  qualifications,
}: {
  action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  rows: AirlineTaskTypeOption[];
  /** The active qualifications a requirement may name. */
  qualifications: { id: string; code: string; name: string }[];
}) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-600 uppercase">
            <tr>
              <th className="px-3 py-2">{t.columns.taskType}</th>
              <th className="px-3 py-2">{t.columns.template}</th>
              <th className="px-3 py-2 text-center">{t.columns.active}</th>
              <th className="px-3 py-2 text-center">{t.columns.primary}</th>
              {qualifications.length > 0 && (
                <>
                  <th className="px-3 py-2">{t.columns.arrivalRequirement}</th>
                  <th className="px-3 py-2">{t.columns.departureRequirement}</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((row) => (
              <tr key={row.taskType.id}>
                <td className="px-3 py-2">
                  <span className="font-medium">{row.taskType.name}</span>{" "}
                  <span className="font-mono text-xs text-neutral-500">{row.taskType.code}</span>
                </td>
                <td className="px-3 py-2">
                  {row.templates.length === 0 ? (
                    <span className="text-neutral-500">{t.noTemplatesForType}</span>
                  ) : (
                    <select
                      name={`template:${row.taskType.id}`}
                      defaultValue={row.templateId ?? ""}
                      className="input py-1"
                      aria-label={`${t.columns.template}: ${row.taskType.name}`}
                    >
                      <option value="">{t.noTemplate}</option>
                      {row.templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    name={`active:${row.taskType.id}`}
                    defaultChecked={row.active}
                    disabled={row.templates.length === 0}
                    className="size-5"
                    aria-label={`${t.columns.active}: ${row.taskType.name}`}
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="radio"
                    name="primary"
                    value={row.taskType.id}
                    defaultChecked={row.isPrimary}
                    disabled={row.templates.length === 0}
                    className="size-5"
                    aria-label={`${t.columns.primary}: ${row.taskType.name}`}
                  />
                </td>
                {qualifications.length > 0 &&
                  (["ARRIVAL_PART", "DEPARTURE_PART"] as const).map((part) => (
                    <RequirementCell
                      key={part}
                      taskTypeId={row.taskType.id}
                      part={part}
                      qualifications={qualifications}
                      checked={row.requirements[part]}
                      disabled={row.templates.length === 0}
                    />
                  ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-neutral-600">{qualifications.length > 0 ? t.requirementHint : t.noQualifications}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? messages.form.saving : t.airlineSave}
        </button>
        <ActionFeedback result={result} successText={t.saved} />
      </div>
    </form>
  );
}
