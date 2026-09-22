"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormField, FormMessage } from "@/components/form-field";
import type { Role } from "@/generated/prisma/enums";
import { messages } from "@/lib/messages";
import type { UserFormInput } from "@/lib/validation/user";
import type { UserFormState } from "./actions";

const t = messages.userForm;
const ROLES: Role[] = ["ADMIN", "SHIFT_LEAD", "AGENT"];

export function UserForm({
  action,
  initial,
  isNew,
}: {
  action: (state: UserFormState, formData: FormData) => Promise<UserFormState>;
  initial: UserFormInput;
  isNew: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (key: keyof UserFormInput) => state.values?.[key] ?? initial[key];
  const error = (key: keyof UserFormInput) => state.errors?.[key];

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <FormMessage message={state.message} />
      <FormField label={t.name} error={error("name")}>
        <input name="name" defaultValue={value("name")} className="input" required />
      </FormField>
      <FormField label={t.username} error={error("username")}>
        <input name="username" defaultValue={value("username")} autoCapitalize="none" className="input" required />
      </FormField>
      <FormField label={t.role} error={error("role")}>
        <select name="role" defaultValue={value("role")} className="input" required>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {messages.roles[role]}
            </option>
          ))}
        </select>
      </FormField>
      <FormField
        label={isNew ? t.password : t.newPassword}
        hint={isNew ? undefined : t.passwordHint}
        error={error("password")}
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
