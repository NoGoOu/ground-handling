"use client";

import { useActionState } from "react";
import { messages } from "@/lib/messages";
import { login, type LoginState } from "./actions";

const t = messages.login;

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-neutral-700">{t.username}</span>
        <input
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          required
          className="input"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-neutral-700">{t.password}</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
        />
      </label>
      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary btn-lg">
        {pending ? t.submitting : t.submit}
      </button>
    </form>
  );
}
