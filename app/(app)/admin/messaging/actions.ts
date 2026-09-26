"use server";

import { refresh } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import { createApiKey, revokeApiKey } from "@/lib/data/api-keys";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { canManageMessaging } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { DELAY_CODE_FIELDS, delayCodeSchema, type DelayCodeFormInput } from "@/lib/validation/delay-code";
import { fieldErrors, formValues, type FormState } from "@/lib/validation/form";

// Messaging settings (CLAUDE.md, 7. mérföldkő): the keys of the receiving API
// and the delay code table.

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

export type DelayCodeFormState = FormState<DelayCodeFormInput>;

/** Creates or updates a delay code; codes are never deleted, only made inactive. */
async function saveDelayCode(id: string | null, formData: FormData): Promise<DelayCodeFormState> {
  const user = await getCurrentUser();
  if (!user || !canManageMessaging(user)) return { message: messages.errors.forbidden };
  const values = formValues(formData, DELAY_CODE_FIELDS);
  const parsed = delayCodeSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  try {
    if (id) await prisma.delayCode.update({ where: { id }, data: parsed.data });
    else await prisma.delayCode.create({ data: parsed.data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { errors: { code: messages.delayCodes.errors.codeTaken }, values };
    }
    throw error;
  }
  refresh();
  return id
    ? { notice: messages.delayCodes.saved }
    : { notice: messages.delayCodes.saved, values: { code: "", description: "", active: "on" } };
}

export async function createDelayCode(_previous: DelayCodeFormState, formData: FormData): Promise<DelayCodeFormState> {
  return saveDelayCode(null, formData);
}

export async function updateDelayCode(
  id: string,
  _previous: DelayCodeFormState,
  formData: FormData,
): Promise<DelayCodeFormState> {
  return saveDelayCode(id, formData);
}
