import { ENDPOINT_LIMITS, RateLimiter } from "@/lib/ops/rate-limit";

// The request limits of the public endpoints (CLAUDE.md, 13. mérföldkő), one
// set per app process. In development hot reloads keep them on globalThis.

type Limiters = Record<keyof typeof ENDPOINT_LIMITS, RateLimiter>;

const make = (): Limiters => ({
  messagesPerKey: new RateLimiter(ENDPOINT_LIMITS.messagesPerKey.limit, ENDPOINT_LIMITS.messagesPerKey.windowMs),
  messagesBadKeyPerIp: new RateLimiter(ENDPOINT_LIMITS.messagesBadKeyPerIp.limit, ENDPOINT_LIMITS.messagesBadKeyPerIp.windowMs),
  calendarPerKey: new RateLimiter(ENDPOINT_LIMITS.calendarPerKey.limit, ENDPOINT_LIMITS.calendarPerKey.windowMs),
  calendarBadKeyPerIp: new RateLimiter(ENDPOINT_LIMITS.calendarBadKeyPerIp.limit, ENDPOINT_LIMITS.calendarBadKeyPerIp.windowMs),
});

const holder = globalThis as unknown as { endpointLimiters?: Limiters };
export const limiters: Limiters = holder.endpointLimiters ?? (holder.endpointLimiters = make());

/** A 429 answer with the seconds to wait. */
export function tooManyRequests(retryAfter: number, body: string | null = null, headers: Record<string, string> = {}): Response {
  return new Response(body, { status: 429, headers: { "Retry-After": String(retryAfter), ...headers } });
}
