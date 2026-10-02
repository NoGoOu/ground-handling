import Link from "next/link";
import { RosterDayCard } from "@/components/roster-day";
import { WeekNav } from "@/components/week-nav";
import { publicBaseUrl } from "@/lib/calendar/public-url";
import { MAX_DOWNLOAD_DAYS } from "@/lib/calendar/roster";
import { getCalendarFeed } from "@/lib/data/calendar";
import { listOwnRoster } from "@/lib/data/shifts";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canViewOwnTasks, canViewRosterOf } from "@/lib/permissions";
import { dateParam } from "@/lib/search-params";
import { requireCapability } from "@/lib/session";
import { addDays, formatDateTime, formatDayShort, startOfWeek, toLocalDate } from "@/lib/time";
import { createFeedAction, revokeFeedAction } from "./actions";
import { CalendarPanel } from "./calendar-panel";

// "Beosztásom" (CLAUDE.md, 12. mérföldkő): the agent's own week on the phone.
// The actual layer leads; where it differs from the published one, both show,
// with the time of the change. The draft never shows.

const r = messages.myRoster;
const c = messages.calendar;

export default async function MyRosterPage(props: PageProps<"/agent/roster">) {
  const user = await requireCapability((u) => canViewRosterOf(u, u.id));
  const { date } = await props.searchParams;
  const today = toLocalDate(new Date());
  const weekStart = startOfWeek(dateParam(date));
  const weekEnd = addDays(weekStart, 6);
  const [days, feed] = await Promise.all([listOwnRoster(user.id, weekStart, 7), getCalendarFeed(user.id)]);

  return (
    <div className="flex flex-col gap-4">
      {canViewOwnTasks(user) && (
        <Link href="/agent" className="self-start text-sm text-sky-700 hover:underline">
          {r.back}
        </Link>
      )}
      <div>
        <h1 className="text-2xl font-bold">{r.title}</h1>
        <p className="text-sm text-neutral-600">
          {fmt(messages.roster.week, { start: formatDayShort(weekStart), end: formatDayShort(weekEnd) })}
        </p>
      </div>
      <p className="max-w-2xl text-sm text-neutral-600">{r.intro}</p>
      <WeekNav basePath="/agent/roster" weekStart={weekStart} thisWeek={startOfWeek(today)} />
      <ul className="flex flex-col gap-3">
        {days.map((day) => (
          <RosterDayCard key={day.day} day={day} today={today} />
        ))}
      </ul>

      <section className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4">
        <div>
          <h2 className="text-lg font-semibold">{c.title}</h2>
          <p className="text-sm text-neutral-600">{c.intro}</p>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold">{c.downloadTitle}</h3>
          <p className="text-sm text-neutral-600">{c.downloadHint}</p>
          {/* A file download, not a page: a plain link and a plain GET form. */}
          <a href={`/api/roster/calendar?from=${weekStart}&to=${weekEnd}`} className="btn btn-secondary btn-lg self-stretch sm:self-start">
            {c.downloadWeek}
          </a>
          <form action="/api/roster/calendar" className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-sm">
              {c.from}
              <input type="date" name="from" defaultValue={weekStart} className="input w-auto" required />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {c.to}
              <input type="date" name="to" defaultValue={addDays(weekStart, MAX_DOWNLOAD_DAYS - 1)} className="input w-auto" required />
            </label>
            <button type="submit" className="btn btn-secondary">
              {c.download}
            </button>
          </form>
        </div>
        <div className="flex flex-col gap-2 border-t border-neutral-100 pt-3">
          <h3 className="font-semibold">{c.subscribeTitle}</h3>
          <p className="text-sm text-neutral-600">{c.subscribeHint}</p>
          <CalendarPanel
            configured={publicBaseUrl(process.env.APP_PUBLIC_URL) !== null}
            feed={feed && { created: formatDateTime(feed.createdAt), used: feed.lastUsedAt && formatDateTime(feed.lastUsedAt) }}
            createAction={createFeedAction}
            revokeAction={revokeFeedAction}
          />
        </div>
      </section>
    </div>
  );
}
