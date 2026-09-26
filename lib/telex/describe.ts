import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import type { UnmatchedReason } from "./match";
import type { MessageType } from "./split";
import type { TelexWarning } from "./warnings";

// The texts of the warnings and the unmatched reasons, from lib/messages/hu.ts.

export function warningText(warning: TelexWarning): string {
  return fmt(messages.telex.warnings[warning.code], warning.params ?? {});
}

/** One line on what happened to the messages of a received text. */
export function resultSummary(
  results: readonly { status: "stored" | "duplicate" | "unsupported"; type: MessageType; unmatchedReason?: unknown }[],
): string {
  const count = (status: string) => results.filter((r) => r.status === status).length;
  return fmt(messages.telex.api.summary, {
    count: results.length,
    stored: count("stored"),
    unmatched: results.filter((r) => r.status === "stored" && r.unmatchedReason).length,
    duplicate: count("duplicate"),
    unsupported: count("unsupported"),
  });
}

export function unmatchedText(reason: UnmatchedReason | string): string {
  return (messages.telex.unmatched as Record<string, string>)[reason] ?? reason;
}
