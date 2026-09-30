"use server";

import { refresh } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import { createApiKey, revokeApiKey } from "@/lib/data/api-keys";
import { removeDelayDocument, saveDelayDocument } from "@/lib/data/delay-documents";
import { prisma } from "@/lib/db";
import { MAX_DELAY_DOCUMENT_BYTES } from "@/lib/delay-document";
import { messages } from "@/lib/messages";
import { canManageMessaging } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { SETTINGS_ID } from "@/lib/settings";
import { DELAY_CODE_FIELDS, delayCodeSchema, type DelayCodeFormInput } from "@/lib/validation/delay-code";
import { fieldErrors, formValues, type FormState } from "@/lib/validation/form";
import {
  ADDRESS_FIELDS,
  addressSchema,
  AIRPORT_FIELDS,
  airportSchema,
  slotToleranceSchema,
  type AirportFormInput,
  SENDER_FIELDS,
  senderSchema,
  type AddressFormInput,
  type SenderFormInput,
} from "@/lib/validation/messaging";

// Messaging settings (CLAUDE.md, 7. mérföldkő): the keys of the receiving API,
// the delay code table, the address book, the sender, the airports and the
// slot tolerance.

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

export type AddressFormState = FormState<AddressFormInput>;

export async function addAddress(_previous: AddressFormState, formData: FormData): Promise<AddressFormState> {
  const user = await getCurrentUser();
  if (!user || !canManageMessaging(user)) return { message: messages.errors.forbidden };
  const values = formValues(formData, ADDRESS_FIELDS);
  const parsed = addressSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  try {
    await prisma.addressBookEntry.create({ data: parsed.data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { errors: { address: messages.addressBook.errors.taken }, values };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return { errors: { airlineId: messages.addressBook.errors.airline }, values };
    }
    throw error;
  }
  refresh();
  return { notice: messages.addressBook.added, values: { ...values, address: "" } };
}

export async function toggleAddress(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canManageMessaging);
    const entry = await prisma.addressBookEntry.findUnique({ where: { id }, select: { active: true } });
    if (!entry) throw new ActionError(messages.errors.notFound);
    await prisma.addressBookEntry.update({ where: { id }, data: { active: !entry.active } });
    refresh();
  });
}

/** An address is configuration, not a record: it may be removed. */
export async function removeAddress(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canManageMessaging);
    const removed = await prisma.addressBookEntry.deleteMany({ where: { id } });
    if (removed.count === 0) throw new ActionError(messages.errors.notFound);
    refresh();
  });
}

export type SenderFormState = FormState<SenderFormInput>;

export async function saveSender(_previous: SenderFormState, formData: FormData): Promise<SenderFormState> {
  const user = await getCurrentUser();
  if (!user || !canManageMessaging(user)) return { message: messages.errors.forbidden };
  const values = formValues(formData, SENDER_FIELDS);
  const parsed = senderSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  await prisma.setting.upsert({ where: { id: SETTINGS_ID }, create: { id: SETTINGS_ID, ...parsed.data }, update: parsed.data });
  refresh();
  return { notice: messages.addressBook.senderSaved };
}

export type AirportFormState = FormState<AirportFormInput>;

/** Creates or updates an airport; airports are never deleted (8. mérföldkő). */
async function saveAirport(id: string | null, formData: FormData): Promise<AirportFormState> {
  const user = await getCurrentUser();
  if (!user || !canManageMessaging(user)) return { message: messages.errors.forbidden };
  const values = formValues(formData, AIRPORT_FIELDS);
  const parsed = airportSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  try {
    if (id) await prisma.airport.update({ where: { id }, data: parsed.data });
    else await prisma.airport.create({ data: parsed.data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { errors: { iataCode: messages.airports.errors.taken }, values };
    }
    throw error;
  }
  refresh();
  return id ? { notice: messages.airports.saved } : { notice: messages.airports.saved, values: { iataCode: "", icaoCode: "", name: "" } };
}

export async function createAirport(_previous: AirportFormState, formData: FormData): Promise<AirportFormState> {
  return saveAirport(null, formData);
}

export async function updateAirport(id: string, _previous: AirportFormState, formData: FormData): Promise<AirportFormState> {
  return saveAirport(id, formData);
}

export type SlotToleranceFormState = FormState<{ slotToleranceMinutes: string }>;

export async function saveSlotTolerance(_previous: SlotToleranceFormState, formData: FormData): Promise<SlotToleranceFormState> {
  const user = await getCurrentUser();
  if (!user || !canManageMessaging(user)) return { message: messages.errors.forbidden };
  const values = formValues(formData, ["slotToleranceMinutes"] as const);
  const parsed = slotToleranceSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  await prisma.setting.upsert({ where: { id: SETTINGS_ID }, create: { id: SETTINGS_ID, ...parsed.data }, update: parsed.data });
  refresh();
  return { notice: messages.slotTolerance.saved };
}

// The airlines' delay code documents (8. mérföldkő, utómunka): one PDF per
// airline; a new upload replaces the old one.

export async function uploadDelayDocument(airlineId: string, _previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actionUser(canManageMessaging);
    const d = messages.delayDocuments.errors;
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new ActionError(d.empty);
    // Before the bytes are read: a file this large is refused by its size alone.
    if (file.size > MAX_DELAY_DOCUMENT_BYTES) throw new ActionError(d.tooLarge);
    const saved = await saveDelayDocument(airlineId, file, actor.id);
    if (!saved.ok) throw new ActionError(d[saved.problem]);
    refresh();
  });
}

export async function removeDelayDocumentOf(airlineId: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actionUser(canManageMessaging);
    if (!(await removeDelayDocument(airlineId, actor.id))) throw new ActionError(messages.errors.notFound);
    refresh();
  });
}
