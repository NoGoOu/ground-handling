import { prisma } from "@/lib/db";
import { LOGIN_LIMITS, loginKey, type LoginAttemptRow } from "@/lib/ops/rate-limit";

// The log of sign-in attempts (CLAUDE.md, 13. mérföldkő, "Biztonság"); the
// lock is decided from it by a pure function.

/** How long the log is kept (placeholder). */
export const LOGIN_LOG_DAYS = 30;

/** The attempts within the window that concern this user name or address. */
export async function recentLoginAttempts(username: string, ip: string, now: Date): Promise<LoginAttemptRow[]> {
  const since = new Date(now.getTime() - LOGIN_LIMITS.windowMinutes * 60_000);
  return prisma.loginAttempt.findMany({
    where: { at: { gt: since }, OR: [{ username: loginKey(username) }, { ip }] },
    select: { username: true, ip: true, result: true, at: true },
  });
}

export async function recordLoginAttempt(username: string, ip: string, result: LoginAttemptRow["result"]): Promise<void> {
  await prisma.loginAttempt.create({ data: { username: loginKey(username), ip, result } });
  if (result !== "SUCCESS") {
    // Failures are rare: tidy the old rows away on them.
    await prisma.loginAttempt.deleteMany({ where: { at: { lt: new Date(Date.now() - LOGIN_LOG_DAYS * 86_400_000) } } });
  }
}
