import Link from "next/link";
import { RosterDayCard } from "@/components/roster-day";
import { WeekNav } from "@/components/week-nav";
import { listOwnRoster } from "@/lib/data/shifts";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canViewOwnTasks, canViewRosterOf } from "@/lib/permissions";
import { dateParam } from "@/lib/search-params";
import { requireCapability } from "@/lib/session";
import { addDays, formatDayShort, startOfWeek, toLocalDate } from "@/lib/time";

// "Beosztásom" (CLAUDE.md, 12. mérföldkő): the agent's own week on the phone.
// The actual layer leads; where it differs from the published one, both show,
// with the time of the change. The draft never shows.

const r = messages.myRoster;

export default async function MyRosterPage(props: PageProps<"/agent/roster">) {
  const user = await requireCapability((u) => canViewRosterOf(u, u.id));
  const { date } = await props.searchParams;
  const today = toLocalDate(new Date());
  const weekStart = startOfWeek(dateParam(date));
  const days = await listOwnRoster(user.id, weekStart, 7);

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
          {fmt(messages.roster.week, { start: formatDayShort(weekStart), end: formatDayShort(addDays(weekStart, 6)) })}
        </p>
      </div>
      <p className="max-w-2xl text-sm text-neutral-600">{r.intro}</p>
      <WeekNav basePath="/agent/roster" weekStart={weekStart} thisWeek={startOfWeek(today)} />
      <ul className="flex flex-col gap-3">
        {days.map((day) => (
          <RosterDayCard key={day.day} day={day} today={today} />
        ))}
      </ul>
    </div>
  );
}
