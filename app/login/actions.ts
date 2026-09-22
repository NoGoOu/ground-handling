"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { messages } from "@/lib/messages";
import { safeCallbackPath } from "@/lib/safe-redirect";

export interface LoginState {
  error?: string;
}

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirectTo: safeCallbackPath(formData.get("callbackUrl")),
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) return { error: messages.login.invalid };
    // signIn signals success by throwing a redirect.
    throw error;
  }
}
