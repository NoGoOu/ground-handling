import { describe, expect, it } from "vitest";
import { clientIp, lockedCode, loginLockedUntil, minutesFromCode, minutesLeft, RateLimiter, type LoginAttemptRow } from "@/lib/ops/rate-limit";

// Limits against guessing and flooding (CLAUDE.md, 13. mérföldkő, "Biztonság").

const now = new Date("2026-10-02T10:00:00Z");
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000);
const attempt = (username: string, ip: string, result: LoginAttemptRow["result"], minutesAgo: number): LoginAttemptRow => ({
  username,
  ip,
  result,
  at: ago(minutesAgo),
});
const failures = (username: string, ip: string, ...minutes: number[]) => minutes.map((m) => attempt(username, ip, "FAILURE", m));

describe("sign-in lock", () => {
  it("locks a user name after five failures within 15 minutes, until the oldest leaves the window", () => {
    const four = failures("kiss.peter", "1.1.1.1", 10, 8, 6, 4);
    expect(loginLockedUntil(four, "kiss.peter", "1.1.1.1", now)).toBeNull();
    const five = [...four, ...failures("kiss.peter", "1.1.1.1", 1)];
    // The oldest counted failure, 10 minutes ago, leaves the window in 5 minutes.
    expect(loginLockedUntil(five, "kiss.peter", "1.1.1.1", now)).toEqual(ago(10 - 15));
    expect(minutesLeft(ago(-5), now)).toBe(5);
  });

  it("locks the name from any address, and counts it in any case", () => {
    const spread = [...failures("Kiss.Peter", "1.1.1.1", 9, 7), ...failures("kiss.peter ", "2.2.2.2", 5, 3, 1)];
    expect(loginLockedUntil(spread, "KISS.PETER", "3.3.3.3", now)).not.toBeNull();
  });

  it("forgets failures older than the window", () => {
    expect(loginLockedUntil(failures("kiss.peter", "1.1.1.1", 30, 25, 20, 16, 15), "kiss.peter", "1.1.1.1", now)).toBeNull();
  });

  it("starts the count again after a successful sign-in", () => {
    const rows = [...failures("kiss.peter", "1.1.1.1", 12, 11, 10, 9), attempt("kiss.peter", "1.1.1.1", "SUCCESS", 8), ...failures("kiss.peter", "1.1.1.1", 2)];
    expect(loginLockedUntil(rows, "kiss.peter", "1.1.1.1", now)).toBeNull();
  });

  it("does not count refused attempts, so waiting always helps", () => {
    const rows = [...failures("kiss.peter", "1.1.1.1", 14, 13, 12, 11, 10), ...[5, 4, 3, 2, 1].map((m) => attempt("kiss.peter", "1.1.1.1", "BLOCKED", m))];
    expect(loginLockedUntil(rows, "kiss.peter", "1.1.1.1", now)).toEqual(ago(14 - 15));
  });

  it("lets one address fail 20 times over many names before it is locked: the airport shares one", () => {
    const names = Array.from({ length: 19 }, (_, i) => attempt(`ugynok${i}`, "9.9.9.9", "FAILURE", 10));
    expect(loginLockedUntil(names, "masik", "9.9.9.9", now)).toBeNull();
    const twenty = [...names, attempt("ugynok19", "9.9.9.9", "FAILURE", 5)];
    expect(loginLockedUntil(twenty, "masik", "9.9.9.9", now)).toEqual(ago(10 - 15));
    // Another address is not touched.
    expect(loginLockedUntil(twenty, "masik", "8.8.8.8", now)).toBeNull();
  });

  it("reads the address Caddy forwards", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.2" }))).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-real-ip": "203.0.113.8" }))).toBe("203.0.113.8");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("request limits", () => {
  it("allows the limit within the window, then tells how long to wait", () => {
    const limiter = new RateLimiter(3, 60_000);
    const t = 1_000_000;
    expect([limiter.hit("k", t), limiter.hit("k", t + 1000), limiter.hit("k", t + 2000)]).toEqual([0, 0, 0]);
    expect(limiter.hit("k", t + 3000)).toBe(57);
    expect(limiter.retryAfter("k", t + 3000)).toBe(57);
    // The first hit leaves the window: one more is allowed.
    expect(limiter.hit("k", t + 60_001)).toBe(0);
    // Keys are separate.
    expect(limiter.hit("other", t + 3000)).toBe(0);
  });

  it("does not count refused hits", () => {
    const limiter = new RateLimiter(1, 10_000);
    expect(limiter.hit("k", 0)).toBe(0);
    for (let i = 1; i < 5; i++) expect(limiter.hit("k", i * 1000)).toBeGreaterThan(0);
    expect(limiter.hit("k", 10_001)).toBe(0);
  });

  it("keeps memory bounded", () => {
    const limiter = new RateLimiter(1, 60_000, 100);
    for (let i = 0; i < 1000; i++) limiter.hit(`key-${i}`, 1000);
    expect((limiter as unknown as { hits: Map<string, number[]> }).hits.size).toBeLessThanOrEqual(100);
  });
});

describe("the refused sign-in", () => {
  it("carries the minutes to the sign-in form, and nothing else is taken for it", () => {
    expect(minutesFromCode(lockedCode(12))).toBe(12);
    expect(minutesFromCode("credentials")).toBeNull();
    expect(minutesFromCode("locked-")).toBeNull();
    expect(minutesFromCode("locked-x")).toBeNull();
  });
});
