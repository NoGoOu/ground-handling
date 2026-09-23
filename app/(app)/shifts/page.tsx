import { DateNav } from "@/components/date-nav";
import { listShiftsForDay } from "@/lib/data/shifts";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canViewRoster } from "@/lib/permissions";
import { dateParam } from "@/lib/search-params";
import { requireCapability } from "@/lib/session";
import { formatTimeOnDay, toLocalDate } from "@/lib/time";

const t = messages.roster;

export default async function RosterPage(props: PageProps<"/shifts">) {
  await requireCapability(canViewRoster);
  const { date: dateValue } = await props.searchParams;
  const date = dateParam(dateValue);
  const shifts = await listShiftsForDay(date, "ACTUAL");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">{messages.pages.shifts}</h1>
        <p className="text-sm text-neutral-600">{fmt(t.count, { count: shifts.length })}</p>
      </div>
      <DateNav basePath="/shifts" date={date} today={toLocalDate(new Date())} />

      {shifts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-600">{t.empty}</p>
      ) : (
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {shifts.map((shift) => (
            <li key={shift.id} className="flex flex-col gap-1 px-4 py-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium">{shift.user.name}</span>
                {shift.note && <span className="text-sm text-neutral-500">{shift.note}</span>}
              </div>
              <ul className="flex flex-wrap gap-2 text-sm">
                {shift.segments.map((segment) => (
                  <li
                    key={segment.id}
                    className={`rounded-md px-2 py-1 ${
                      segment.type.operative ? "bg-sky-50 text-sky-900" : "bg-violet-50 text-violet-900"
                    }`}
                  >
                    <span className="font-medium">{segment.type.name}</span>{" "}
                    <span className="tabular-nums">
                      {formatTimeOnDay(segment.start, date)}–{formatTimeOnDay(segment.end, date)}
                    </span>
                    {segment.location && <span className="text-neutral-600"> · {segment.location}</span>}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
