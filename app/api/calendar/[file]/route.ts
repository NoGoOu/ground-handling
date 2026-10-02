import type { NextRequest } from "next/server";
import { keyFromFileName } from "@/lib/calendar/public-url";
import { feedRange } from "@/lib/calendar/roster";
import { findCalendarFeed, lastPublishedDay, markCalendarFeedUsed, rosterCalendarText } from "@/lib/data/calendar";
import { limiters, tooManyRequests } from "@/lib/ops/limits";
import { clientIp } from "@/lib/ops/rate-limit";
import { canViewRosterOf } from "@/lib/permissions";
import { loadUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { toLocalDate } from "@/lib/time";

// The subscription link of one's own roster (CLAUDE.md, 12. mérföldkő): a
// calendar cannot sign in, so the key in the link stands for the user. Read
// only, their own roster only; the proxy lets it through without a session.
// A wrong key, an inactive user and a lost right all get the same 404.

async function feedUser(ctx: RouteContext<"/api/calendar/[file]">) {
  const { file } = await ctx.params;
  const key = keyFromFileName(file);
  const feed = key ? await findCalendarFeed(key) : null;
  const user = feed ? await loadUser(feed.userId) : null;
  return feed && user && canViewRosterOf(user, user.id) ? { feed, user } : null;
}

const headers = {
  "Content-Type": "text/calendar; charset=utf-8",
  "Content-Disposition": 'inline; filename="beosztas.ics"',
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(request: NextRequest, ctx: RouteContext<"/api/calendar/[file]">) {
  // Too many requests (13. mérföldkő): an address guessing keys is held back,
  // and so is a link fetched far more often than a calendar would.
  const ip = clientIp(request.headers);
  const held = limiters.calendarBadKeyPerIp.retryAfter(ip);
  if (held) return tooManyRequests(held);
  const found = await feedUser(ctx);
  if (!found) {
    limiters.calendarBadKeyPerIp.hit(ip);
    return new Response("Not found", { status: 404 });
  }
  const wait = limiters.calendarPerKey.hit(found.feed.id);
  if (wait) return tooManyRequests(wait);
  await markCalendarFeedUsed(found.feed.id);
  const today = toLocalDate(new Date());
  const [lastDay, settings] = await Promise.all([lastPublishedDay(), getSettings()]);
  const text = await rosterCalendarText(found.user, feedRange(today, lastDay), settings.calendarRefreshMinutes);
  return new Response(text, { headers });
}

/** Some calendars ask first; the answer does not count as a fetch. */
export async function HEAD(_request: NextRequest, ctx: RouteContext<"/api/calendar/[file]">) {
  const found = await feedUser(ctx);
  return new Response(null, found ? { headers } : { status: 404 });
}
