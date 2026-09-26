"use server";

import { refresh } from "next/cache";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import { assignMessage, discardMessage, processText } from "@/lib/data/messages";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canRecordMessages } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { byteLength, MAX_API_BYTES } from "@/lib/telex/api-request";
import { unmatchedText, warningText } from "@/lib/telex/describe";
import { parseLocalDateTime } from "@/lib/time";

// Pasting messages by hand and handling the unmatched ones (CLAUDE.md,
// 7. mérföldkő): the same processing as the receiving API.

const t = messages.inbox;

export interface PasteResult {
  type: string;
  status: "stored" | "duplicate" | "unsupported";
  flightId: string | null;
  /** "ET3365 · üzemnap 2026-09-12 · Indulási rész", or why it is unmatched. */
  summary: string | null;
  unmatched: boolean;
  current: boolean;
  warnings: string[];
}

export type PasteState = { error?: string; results?: PasteResult[] };

export async function pasteMessages(_previous: PasteState, formData: FormData): Promise<PasteState> {
  const user = await getCurrentUser();
  if (!user || !canRecordMessages(user)) return { error: messages.errors.forbidden };
  const text = String(formData.get("text") ?? "");
  if (byteLength(text) > MAX_API_BYTES) return { error: t.tooLarge };
  const receivedText = String(formData.get("receivedAt") ?? "").trim();
  const receivedAt = receivedText ? parseLocalDateTime(receivedText) : new Date();
  if (!receivedAt) return { error: t.badTime };

  const results = await processText(text, { source: "MANUAL", receivedAt, userId: user.id, apiKeyId: null, sourceNote: null });
  if (results.length === 0) return { error: t.noMessage };
  refresh();
  return {
    results: results.map((result): PasteResult => {
      if (result.status !== "stored") {
        return { type: result.type, status: result.status, flightId: null, summary: null, unmatched: false, current: false, warnings: [] };
      }
      return {
        type: result.type,
        status: "stored",
        flightId: result.matched?.flightId ?? null,
        summary: result.matched
          ? fmt(t.matched, {
              flight: result.matched.flightNumber,
              day: result.matched.operatingDay,
              part: messages.part[result.matched.part],
            })
          : fmt(t.unmatched.reason, { reason: unmatchedText(result.unmatchedReason ?? "none") }),
        unmatched: !result.matched,
        current: result.current,
        warnings: result.warnings.map(warningText),
      };
    }),
  };
}

/** Hangs an unmatched message on the flight part chosen in the list ("flightId|part"). */
export async function assignUnmatched(messageId: string, _previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await actionUser(canRecordMessages);
    const [flightId, part] = String(formData.get("target") ?? "").split("|");
    if (!flightId || (part !== "ARRIVAL_PART" && part !== "DEPARTURE_PART")) throw new ActionError(t.unmatched.invalidTarget);
    const warnings = await assignMessage(messageId, flightId, part, user.id);
    if (!warnings) throw new ActionError(messages.errors.notFound);
    refresh();
    return warnings.length > 0 ? { ok: true, warning: warnings.map(warningText).join(" ") } : { ok: true };
  });
}

export async function discardUnmatched(messageId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await actionUser(canRecordMessages);
    if (!(await discardMessage(messageId, user.id))) throw new ActionError(messages.errors.notFound);
    refresh();
  });
}
