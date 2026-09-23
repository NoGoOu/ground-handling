"use client";

import { Fragment, useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";
import { PERMISSIONS, SCOPE_LABELS, SCOPES, type Permission, type Scope } from "@/lib/permissions";

const t = messages.roleForm;

type Action = (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;

export interface RoleColumn {
  id: string;
  name: string;
  locked: boolean;
  /** Ticked permissions with their scope. */
  granted: Partial<Record<Permission, Scope>>;
}

function Cell({ role, permission }: { role: RoleColumn; permission: Permission }) {
  const scope = role.granted[permission];
  const scoped = PERMISSIONS[permission].scoped;

  return (
    <td className="px-3 py-2 align-top">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="granted"
          value={`${role.id}:${permission}`}
          defaultChecked={!!scope}
          disabled={role.locked}
          className="size-4"
          aria-label={`${role.name}: ${PERMISSIONS[permission].label}`}
        />
        {scoped ? (
          <select
            name={`scope:${role.id}:${permission}`}
            defaultValue={scope ?? "ALL"}
            disabled={role.locked}
            aria-label={`${role.name}: ${PERMISSIONS[permission].label} – ${t.scopeTitle}`}
            className="input w-24 px-1 py-0.5 text-xs"
          >
            {SCOPES.map((option) => (
              <option key={option} value={option}>
                {SCOPE_LABELS[option]}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-neutral-400">{t.noScope}</span>
        )}
      </label>
    </td>
  );
}

export function RoleMatrix({
  action,
  roles,
  groups,
}: {
  action: Action;
  roles: RoleColumn[];
  groups: { group: string; permissions: Permission[] }[];
}) {
  const [result, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50">
            <tr>
              <th className="px-3 py-2 text-xs text-neutral-600 uppercase">{t.permission}</th>
              {roles.map((role) => (
                <th key={role.id} className="px-3 py-2 text-xs text-neutral-600 uppercase">
                  {role.name}
                  {role.locked && <span className="ml-1 font-normal normal-case">({t.builtIn})</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {groups.map((group) => (
              <Fragment key={group.group}>
                <tr className="bg-neutral-50">
                  <td colSpan={roles.length + 1} className="px-3 py-1 text-xs font-semibold text-neutral-600">
                    {group.group}
                  </td>
                </tr>
                {group.permissions.map((permission) => (
                  <tr key={permission}>
                    <td className="px-3 py-2">{PERMISSIONS[permission].label}</td>
                    {roles.map((role) => (
                      <Cell key={role.id} role={role} permission={permission} />
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? messages.form.saving : t.saveMatrix}
        </button>
        <span className="text-sm text-neutral-600">{t.builtInHint}</span>
      </div>
      <ActionFeedback result={result} successText={messages.form.saved} />
    </form>
  );
}

export function NewRoleForm({ action }: { action: Action }) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-neutral-700">{t.newName}</span>
        <input name="name" maxLength={60} className="input" required />
      </label>
      <button type="submit" disabled={pending} className="btn btn-secondary">
        {t.create}
      </button>
      <ActionFeedback result={result} />
    </form>
  );
}
