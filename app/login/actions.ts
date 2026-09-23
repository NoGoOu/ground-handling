"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { canAccessPath, homePathFor } from "@/lib/permissions";
import { safeCallbackPath } from "@/lib/safe-redirect";
import { loadUser } from "@/lib/session";

export interface LoginState {
  error?: string;
}

/** The requested page if the user may open it, otherwise their home page. */
async function targetFor(username: unknown, requested: string): Promise<string> {
  if (typeof username !== "string") return "/";
  const found = await prisma.user.findUnique({ where: { username: username.trim() }, select: { id: true } });
  const user = found ? await loadUser(found.id) : null;
  if (!user) return "/";
  const { pathname } = new URL(requested, "http://localhost");
  return canAccessPath(user, pathname) ? requested : homePathFor(user);
}

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const username = formData.get("username");
  try {
    await signIn("credentials", {
      username,
      password: formData.get("password"),
      redirectTo: await targetFor(username, safeCallbackPath(formData.get("callbackUrl"))),
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) return { error: messages.login.invalid };
    // signIn signals success by throwing a redirect.
    throw error;
  }
}
