import type { NextRequest } from "next/server";
import { downloadRange } from "@/lib/calendar/roster";
import { rosterCalendarText } from "@/lib/data/calendar";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canViewRosterOf } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { toLocalDate } from "@/lib/time";

// "Mentés a naptárba" (CLAUDE.md, 12. mérföldkő): one's own roster as an .ics
// file for the shown week or a chosen period of at most 31 days. A one-off
// copy: later changes do not follow it.
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });
  if (!canViewRosterOf(user, user.id)) return new Response(null, { status: 404 });
  const params = request.nextUrl.searchParams;
  const range = downloadRange(params.get("from"), params.get("to"), toLocalDate(new Date()));
  if (!range) {
    return new Response(messages.calendar.errors.range, { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  const { calendarRefreshMinutes } = await getSettings();
  const text = await rosterCalendarText(user, range, calendarRefreshMinutes);
  return new Response(text, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fmt(messages.calendar.fileName, { start: range.start })}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
