"use server";

import { refresh } from "next/cache";
import type { ActionResult } from "@/lib/action";
import { feedUrl, publicBaseUrl } from "@/lib/calendar/public-url";
import { createCalendarFeed, revokeCalendarFeed } from "@/lib/data/calendar";
import { messages } from "@/lib/messages";
import { canViewRosterOf } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";

// The agent's own subscription link (CLAUDE.md, 12. mérföldkő, "Feliratkozás").

export type FeedResult = { ok: true; url: string } | { ok: false; error: string };

/** A new link, replacing the old one; the link is returned once and never stored. */
export async function createFeedAction(): Promise<FeedResult> {
  const user = await getCurrentUser();
  if (!user || !canViewRosterOf(user, user.id)) return { ok: false, error: messages.errors.forbidden };
  const base = publicBaseUrl(process.env.APP_PUBLIC_URL);
  if (!base) return { ok: false, error: messages.calendar.errors.notConfigured };
  const key = await createCalendarFeed(user.id);
  refresh();
  return { ok: true, url: feedUrl(base, key) };
}

export async function revokeFeedAction(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: messages.errors.forbidden };
  await revokeCalendarFeed(user.id);
  refresh();
  return { ok: true };
}
