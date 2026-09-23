"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormField, FormMessage } from "@/components/form-field";
import { messages } from "@/lib/messages";
import type { UserFormInput } from "@/lib/validation/user";
import type { UserFormState } from "./actions";

const t = messages.userForm;

export interface RoleOption {
  id: string;
  name: string;
}

export function UserForm({
  action,
  initial,
  isNew,
  roles,
}: {
  action: (state: UserFormState, formData: FormData) => Promise<UserFormState>;
  initial: UserFormInput;
  isNew: boolean;
  roles: RoleOption[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (key: "name" | "username" | "active") => state.values?.[key] ?? initial[key];
  const roleIds = state.values?.roleIds ?? initial.roleIds;

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <FormMessage message={state.message} />
      <FormField label={t.name} error={state.errors?.name}>
        <input name="name" defaultValue={value("name")} className="input" required />
      </FormField>
      <FormField label={t.username} error={state.errors?.username}>
        <input name="username" defaultValue={value("username")} autoCapitalize="none" className="input" required />
      </FormField>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-neutral-700">{t.roles}</legend>
        {roles.map((role) => (
          <label key={role.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              name="roleIds"
              value={role.id}
              defaultChecked={roleIds.includes(role.id)}
              className="size-5"
            />
            <span>{role.name}</span>
          </label>
        ))}
        <p className="text-sm text-neutral-600">{t.rolesHint}</p>
      </fieldset>

      <FormField
        label={isNew ? t.password : t.newPassword}
        hint={isNew ? undefined : t.passwordHint}
        error={state.errors?.password}
      >
        <input name="password" type="password" autoComplete="new-password" className="input" required={isNew} />
      </FormField>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="active"
          defaultChecked={value("active") === "on"}
          key={value("active")}
          className="size-5"
        />
        <span>{t.active}</span>
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? messages.form.saving : isNew ? t.create : messages.form.save}
        </button>
        <Link href="/admin/users" className="btn btn-secondary">
          {messages.form.cancel}
        </Link>
      </div>
    </form>
  );
}
