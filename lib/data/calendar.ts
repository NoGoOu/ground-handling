import { createHash, randomBytes } from "node:crypto";
import { buildCalendar } from "@/lib/calendar/ics";
import { calendarName, rosterEvents } from "@/lib/calendar/roster";
import { listOwnRoster } from "@/lib/data/shifts";
import { prisma } from "@/lib/db";
import { toLocalDate } from "@/lib/time";

// The roster calendar (CLAUDE.md, 12. mérföldkő, "Naptár"): the .ics text,
// and the personal subscription links. A link carries a secret key because a
// calendar cannot sign in; only its hash is kept, and it is seen only once.

const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

/** The user's own roster as an .ics text, for the given days. */
export async function rosterCalendarText(
  user: { id: string; name: string },
  range: { start: string; days: number },
  refreshMinutes: number,
): Promise<string> {
  const days = await listOwnRoster(user.id, range.start, range.days);
  return buildCalendar({ name: calendarName(user.name), refreshMinutes, events: rosterEvents(days), now: new Date() });
}

/** The last published day, the far end of the subscription; null when nothing is published. */
export async function lastPublishedDay(): Promise<string | null> {
  const latest = await prisma.publication.aggregate({ _max: { endDate: true } });
  return latest._max.endDate ? toLocalDate(latest._max.endDate) : null;
}

/** Makes the user's link, replacing the old one; the returned key is the only time it is seen. */
export async function createCalendarFeed(userId: string): Promise<string> {
  const key = randomBytes(24).toString("base64url");
  await prisma.calendarFeed.upsert({
    where: { userId },
    create: { userId, keyHash: hashKey(key) },
    update: { keyHash: hashKey(key), createdAt: new Date(), lastUsedAt: null },
  });
  return key;
}

export async function revokeCalendarFeed(userId: string): Promise<boolean> {
  const removed = await prisma.calendarFeed.deleteMany({ where: { userId } });
  return removed.count > 0;
}

export async function getCalendarFeed(userId: string) {
  return prisma.calendarFeed.findUnique({ where: { userId }, select: { createdAt: true, lastUsedAt: true } });
}

/** The feed of a key, or null. */
export async function findCalendarFeed(key: string) {
  return prisma.calendarFeed.findUnique({ where: { keyHash: hashKey(key) }, select: { id: true, userId: true } });
}

export async function markCalendarFeedUsed(id: string): Promise<void> {
  await prisma.calendarFeed.update({ where: { id }, data: { lastUsedAt: new Date() } });
}

/** Every live link by user, for the admin. */
export async function listCalendarFeeds(): Promise<Map<string, { createdAt: Date; lastUsedAt: Date | null }>> {
  const feeds = await prisma.calendarFeed.findMany({ select: { userId: true, createdAt: true, lastUsedAt: true } });
  return new Map(feeds.map(({ userId, ...feed }) => [userId, feed]));
}
