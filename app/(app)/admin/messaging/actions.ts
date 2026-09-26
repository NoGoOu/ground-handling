"use server";

import { refresh } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import { createApiKey, revokeApiKey } from "@/lib/data/api-keys";
import { messages } from "@/lib/messages";
import { canManageMessaging } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";

// Messaging settings (CLAUDE.md, 7. mérföldkő): the keys of the receiving API.

const e = messages.messaging.apiKeys.errors;

/** The new key is returned once, to be shown once. */
export type ApiKeyFormState = { error?: string; key?: string };

export async function createKey(_previous: ApiKeyFormState, formData: FormData): Promise<ApiKeyFormState> {
  const user = await getCurrentUser();
  if (!user || !canManageMessaging(user)) return { error: messages.errors.forbidden };
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 60) return { error: e.name };
  try {
    const key = await createApiKey(name, user.id);
    refresh();
    return { key };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: e.nameTaken };
    throw error;
  }
}

export async function revokeKey(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canManageMessaging);
    if (!(await revokeApiKey(id))) throw new ActionError(messages.errors.notFound);
    refresh();
  });
}
