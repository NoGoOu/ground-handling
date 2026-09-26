import type { NextRequest } from "next/server";
import { findActiveKey, logApiCall } from "@/lib/data/api-keys";
import { processText, type ProcessedMessage } from "@/lib/data/messages";
import { messages } from "@/lib/messages";
import { bearerKey, MAX_API_BYTES, readApiBody } from "@/lib/telex/api-request";
import { resultSummary, unmatchedText, warningText } from "@/lib/telex/describe";

// The receiving API (CLAUDE.md, 7. mérföldkő, "Fogadás"): external sources
// post messages with an API key; the same processing as pasting by hand.
// Every call is logged with its key, time and outcome.

const t = messages.telex.api.errors;

const ERRORS = {
  invalidKey: { status: 401, code: "invalid_api_key", text: t.invalidKey },
  tooLarge: { status: 413, code: "too_large", text: t.tooLarge },
  badJson: { status: 400, code: "bad_json", text: t.badJson },
  noText: { status: 400, code: "no_text", text: t.noText },
  badSource: { status: 400, code: "bad_source", text: t.badSource },
  badReceivedAt: { status: 400, code: "bad_received_at", text: t.badReceivedAt },
  noMessage: { status: 422, code: "no_message", text: t.noMessage },
} as const;

async function fail(apiKeyId: string | null, error: keyof typeof ERRORS) {
  const { status, code, text } = ERRORS[error];
  await logApiCall(apiKeyId, status, text);
  return Response.json({ error: code, message: text }, { status });
}

function apiResult(result: ProcessedMessage) {
  if (result.status === "unsupported") {
    return { type: result.type, status: result.status, flightNumber: result.flightNumber, headerDate: result.headerDate };
  }
  if (result.status === "duplicate") return { type: result.type, status: result.status, id: result.messageId };
  return {
    type: result.type,
    status: result.status,
    id: result.messageId,
    matched: !!result.matched,
    ...(result.matched
      ? {
          flight: result.matched.flightNumber,
          operatingDay: result.matched.operatingDay,
          part: result.matched.part,
          current: result.current,
        }
      : { reason: result.unmatchedReason, reasonText: result.unmatchedReason ? unmatchedText(result.unmatchedReason) : null }),
    warnings: result.warnings.map((w) => ({ code: w.code, text: warningText(w) })),
  };
}

export async function POST(request: NextRequest) {
  const key = bearerKey(request.headers.get("authorization"));
  const apiKey = key ? await findActiveKey(key) : null;
  if (!apiKey) return fail(null, "invalidKey");
  if (Number(request.headers.get("content-length") ?? 0) > MAX_API_BYTES) return fail(apiKey.id, "tooLarge");

  const body = readApiBody(request.headers.get("content-type"), await request.text(), new Date());
  if (!body.ok) return fail(apiKey.id, body.error);
  const results = await processText(body.text, {
    source: "API",
    receivedAt: body.receivedAt,
    userId: null,
    apiKeyId: apiKey.id,
    sourceNote: body.source,
  });
  if (results.length === 0) return fail(apiKey.id, "noMessage");
  await logApiCall(apiKey.id, 200, resultSummary(results));
  return Response.json({ messages: results.map(apiResult) });
}
