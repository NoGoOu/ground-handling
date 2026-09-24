"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";

const t = messages.airlineForm;

/** The airline's default template, used by the schedule import. */
export function DefaultTemplateForm({
  action,
  templates,
  current,
}: {
  action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  templates: { id: string; name: string }[];
  current: string | null;
}) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} key={current ?? ""} className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-neutral-700">{t.defaultTemplate}</span>
        <div className="flex flex-wrap items-center gap-2">
          <select name="defaultTemplateId" defaultValue={current ?? ""} className="input w-auto py-1.5">
            <option value="">{t.noDefaultTemplate}</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <button type="submit" disabled={pending} className="btn btn-secondary">
            {messages.form.save}
          </button>
        </div>
      </label>
      <span className="text-sm text-neutral-500">{t.defaultTemplateHint}</span>
      <ActionFeedback result={result} successText={messages.form.saved} />
    </form>
  );
}
