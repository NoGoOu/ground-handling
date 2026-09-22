import { messages } from "@/lib/messages";
import { getCurrentUser, type CurrentUser } from "@/lib/session";

// Every server action checks authorization itself; the proxy alone is not enough.

export type ActionResult = { ok: true; warning?: string } | { ok: false; error: string };

/** An expected failure whose message is shown to the user. */
export class ActionError extends Error {}

export async function actionUser(allowed?: (user: CurrentUser) => boolean): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || (allowed && !allowed(user))) throw new ActionError(messages.errors.forbidden);
  return user;
}

/** Turns ActionErrors into results; anything else (including redirects) propagates. */
export async function runAction(body: () => Promise<ActionResult | void>): Promise<ActionResult> {
  try {
    return (await body()) ?? { ok: true };
  } catch (error) {
    if (error instanceof ActionError) return { ok: false, error: error.message };
    throw error;
  }
}
