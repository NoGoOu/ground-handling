// Limits against guessing and flooding (CLAUDE.md, 13. mérföldkő,
// "Biztonság"). Pure functions; the numbers are placeholders.

const MINUTE_MS = 60_000;

/**
 * Sign-in: at most this many failures within the window, per user name and
 * per address (approved decision 1: an address gets more, as many agents sign
 * in from the airport's one public address).
 */
export const LOGIN_LIMITS = { windowMinutes: 15, perUsername: 5, perIp: 20 } as const;
export type LoginLimits = { windowMinutes: number; perUsername: number; perIp: number };

export interface LoginAttemptRow {
  username: string;
  ip: string;
  result: "SUCCESS" | "FAILURE" | "BLOCKED";
  at: Date;
}

/** The user name as it is counted: trimmed and in lower case. */
export function loginKey(username: string): string {
  return username.trim().toLowerCase();
}

/** When the window lets a list of failures under the limit again; null when it is under already. */
function freeAt(failures: readonly Date[], limit: number, windowMs: number): Date | null {
  if (failures.length < limit) return null;
  const sorted = [...failures].sort((a, b) => a.getTime() - b.getTime());
  return new Date(sorted[sorted.length - limit].getTime() + windowMs);
}

/**
 * Until when a sign-in is refused, or null. A user name counts its failures
 * since its last success; an address counts every failure. Refused attempts
 * (BLOCKED) do not count, so waiting the window out always helps.
 */
export function loginLockedUntil(
  attempts: readonly LoginAttemptRow[],
  username: string,
  ip: string,
  now: Date,
  limits: LoginLimits = LOGIN_LIMITS,
): Date | null {
  const windowMs = limits.windowMinutes * MINUTE_MS;
  const since = now.getTime() - windowMs;
  const name = loginKey(username);
  const recent = attempts.filter((a) => a.at.getTime() > since && a.at.getTime() <= now.getTime());
  const lastSuccess = Math.max(
    0,
    ...recent.filter((a) => loginKey(a.username) === name && a.result === "SUCCESS").map((a) => a.at.getTime()),
  );
  const nameFailures = recent.filter((a) => loginKey(a.username) === name && a.result === "FAILURE" && a.at.getTime() > lastSuccess);
  const ipFailures = recent.filter((a) => a.ip === ip && a.result === "FAILURE");
  const until = [freeAt(nameFailures.map((a) => a.at), limits.perUsername, windowMs), freeAt(ipFailures.map((a) => a.at), limits.perIp, windowMs)]
    .filter((d): d is Date => d !== null && d.getTime() > now.getTime())
    .sort((a, b) => b.getTime() - a.getTime());
  return until[0] ?? null;
}

/** Whole minutes left, at least one. */
export function minutesLeft(until: Date, now: Date): number {
  return Math.max(1, Math.ceil((until.getTime() - now.getTime()) / MINUTE_MS));
}

const LOCKED_PREFIX = "locked-";

/** The error code of a refused sign-in: it carries the minutes to wait. */
export function lockedCode(minutes: number): string {
  return `${LOCKED_PREFIX}${minutes}`;
}

/** The minutes from a refused sign-in's code, or null for any other code. */
export function minutesFromCode(code: string): number | null {
  if (!code.startsWith(LOCKED_PREFIX)) return null;
  const minutes = Number(code.slice(LOCKED_PREFIX.length));
  return Number.isInteger(minutes) && minutes > 0 ? minutes : null;
}

/** The client's address from the header Caddy sets; "unknown" without one. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * A sliding window in memory: at most `limit` hits per key within `windowMs`.
 * Enough for one app process on one server; it starts empty after a restart.
 */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    readonly limit: number,
    readonly windowMs: number,
    private readonly maxKeys = 10_000,
  ) {}

  private recent(key: string, now: number): number[] {
    const list = (this.hits.get(key) ?? []).filter((t) => t > now - this.windowMs);
    if (list.length) this.hits.set(key, list);
    else this.hits.delete(key);
    return list;
  }

  /** Seconds until the key may try again; 0 when it may now. */
  retryAfter(key: string, now = Date.now()): number {
    const list = this.recent(key, now);
    if (list.length < this.limit) return 0;
    return Math.max(1, Math.ceil((list[list.length - this.limit] + this.windowMs - now) / 1000));
  }

  /** Counts a hit; returns the seconds to wait when it is over the limit, else 0. */
  hit(key: string, now = Date.now()): number {
    const wait = this.retryAfter(key, now);
    if (wait > 0) return wait;
    if (!this.hits.has(key) && this.hits.size >= this.maxKeys) this.prune(now);
    this.hits.set(key, [...(this.hits.get(key) ?? []), now]);
    return 0;
  }

  private prune(now: number): void {
    for (const key of [...this.hits.keys()]) this.recent(key, now);
    // Still full: drop the oldest keys, so memory stays bounded.
    for (const key of this.hits.keys()) {
      if (this.hits.size < this.maxKeys) break;
      this.hits.delete(key);
    }
  }
}

/** The public endpoints (placeholders): per key, and per address for wrong keys. */
export const ENDPOINT_LIMITS = {
  messagesPerKey: { limit: 60, windowMs: MINUTE_MS },
  messagesBadKeyPerIp: { limit: 20, windowMs: MINUTE_MS },
  calendarPerKey: { limit: 60, windowMs: 60 * MINUTE_MS },
  calendarBadKeyPerIp: { limit: 30, windowMs: MINUTE_MS },
} as const;
