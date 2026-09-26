// The body of POST /api/messages (CLAUDE.md, 7. mérföldkő, "Fogadás"): raw
// text, or JSON with "text" and optionally "source" and "receivedAt". Pure.

/** Per request (placeholder). */
export const MAX_API_BYTES = 256 * 1024;

export type ApiBody =
  | { ok: true; text: string; source: string | null; receivedAt: Date }
  | { ok: false; error: "tooLarge" | "badJson" | "noText" | "badSource" | "badReceivedAt" };

export const byteLength = (text: string) => new TextEncoder().encode(text).length;

export function readApiBody(contentType: string | null, body: string, now: Date): ApiBody {
  if (byteLength(body) > MAX_API_BYTES) return { ok: false, error: "tooLarge" };
  if (!(contentType ?? "").toLowerCase().includes("application/json")) {
    return body.trim() === "" ? { ok: false, error: "noText" } : { ok: true, text: body, source: null, receivedAt: now };
  }
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return { ok: false, error: "badJson" };
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return { ok: false, error: "badJson" };
  const { text, source, receivedAt } = value as Record<string, unknown>;
  if (typeof text !== "string" || text.trim() === "") return { ok: false, error: "noText" };
  if (source !== undefined && source !== null && (typeof source !== "string" || source.length > 100)) {
    return { ok: false, error: "badSource" };
  }
  let received = now;
  if (receivedAt !== undefined && receivedAt !== null) {
    // An ISO 8601 time with its offset, e.g. "2026-09-17T07:20:00Z".
    const parsed = typeof receivedAt === "string" && /[zZ]|[+-]\d{2}:?\d{2}$/.test(receivedAt) ? new Date(receivedAt) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) return { ok: false, error: "badReceivedAt" };
    received = parsed;
  }
  return { ok: true, text, source: typeof source === "string" && source.trim() !== "" ? source.trim() : null, receivedAt: received };
}

/** An API key: a prefix to recognise it and 32 random characters. */
export const API_KEY_PREFIX = "ghk_";

export function looksLikeApiKey(value: string): boolean {
  return value.startsWith(API_KEY_PREFIX) && /^[A-Za-z0-9_-]{36,80}$/.test(value);
}

/** "Bearer ghk_…" → the key; null without one. */
export function bearerKey(header: string | null): string | null {
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match && looksLikeApiKey(match[1]) ? match[1] : null;
}
