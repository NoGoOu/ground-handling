"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";
import { PERMISSIONS, SCOPE_LABELS, SCOPES, type Permission, type Scope } from "@/lib/permissions";

const t = messages.userPermissions;

/** Individual grants on top of the roles. */
export function UserPermissionsForm({
  action,
  granted,
  groups,
}: {
  action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  granted: Partial<Record<Permission, Scope>>;
  groups: { group: string; permissions: Permission[] }[];
}) {
  const [result, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <p className="text-sm text-neutral-600">{t.hint}</p>
      {groups.map((group) => (
        <fieldset key={group.group} className="flex flex-col gap-1">
          <legend className="text-xs font-semibold text-neutral-600 uppercase">{group.group}</legend>
          {group.permissions.map((permission) => (
            <label key={permission} className="flex flex-wrap items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="granted"
                value={permission}
                defaultChecked={!!granted[permission]}
                className="size-4"
              />
              <span className="min-w-56">{PERMISSIONS[permission].label}</span>
              {PERMISSIONS[permission].scoped && (
                <select
                  name={`scope:${permission}`}
                  defaultValue={granted[permission] ?? "ALL"}
                  aria-label={`${PERMISSIONS[permission].label} – ${t.scope}`}
                  className="input w-28 px-1 py-0.5 text-xs"
                >
                  {SCOPES.map((scope) => (
                    <option key={scope} value={scope}>
                      {SCOPE_LABELS[scope]}
                    </option>
                  ))}
                </select>
              )}
            </label>
          ))}
        </fieldset>
      ))}
      <div>
        <button type="submit" disabled={pending} className="btn btn-secondary">
          {pending ? messages.form.saving : t.save}
        </button>
      </div>
      <ActionFeedback result={result} successText={messages.form.saved} />
    </form>
  );
}
