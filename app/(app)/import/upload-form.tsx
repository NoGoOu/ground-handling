"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";

const t = messages.import;

export function UploadForm({
  action,
}: {
  action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;
}) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-neutral-700">{t.file}</span>
        <input
          type="file"
          name="file"
          accept=".csv,.json,.xlsx,.xls"
          required
          className="block text-sm file:mr-3 file:rounded-md file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:text-sky-800"
        />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? t.uploading : t.uploadSubmit}
        </button>
        <ActionFeedback result={result} />
      </div>
    </form>
  );
}
