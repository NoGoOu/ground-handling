import Link from "next/link";
import type { RosterLayer } from "@/generated/prisma/client";
import { isPublished, listPublicationsInRange } from "@/lib/data/publications";
import { listRosterAgents, listShiftsInRange, type RosterShift } from "@/lib/data/shifts";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import {
  canManageSegmentTypes,
  canPublishRoster,
  canViewRoster,
  rosterVisibleUserIds,
  visibleLayers,
} from "@/lib/permissions";
import { dateParam } from "@/lib/search-params";
import { requireCapability } from "@/lib/session";
import { addDays, formatDayShort, formatTimeOnDay, startOfWeek, toLocalDate, weekdayIndex } from "@/lib/time";
import { publishPeriod } from "./actions";
import { PublishForm } from "./publish-form";

const t = messages.roster;
const DAYS = 7;

const layerLabels: Record<RosterLayer, string> = {
  DRAFT: t.layerDraft,
  PUBLISHED: t.layerPublished,
  ACTUAL: t.layerActual,
};

/** Shifts belong to the day their first segment starts on. */
const cellKey = (userId: string, day: string) => `${userId} ${day}`;

function groupByCell(shifts: RosterShift[]): Map<string, RosterShift[]> {
  const cells = new Map<string, RosterShift[]>();
  for (const shift of shifts) {
    if (!shift.start) continue;
    const key = cellKey(shift.user.id, toLocalDate(shift.start));
    const list = cells.get(key);
    if (list) list.push(shift);
    else cells.set(key, [shift]);
  }
  return cells;
}

/** Two layers match when they hold the same segments (type and times). */
function sameShifts(a: RosterShift[], b: RosterShift[]): boolean {
  const key = (shifts: RosterShift[]) =>
    shifts
      .flatMap((shift) => shift.segments.map((s) => `${s.type.id} ${s.start.toISOString()} ${s.end.toISOString()}`))
      .sort()
      .join(" | ");
  return key(a) === key(b);
}

function LayerLine({ layer, shifts, day }: { layer: RosterLayer; shifts: RosterShift[]; day: string }) {
  return (
    <span className="flex flex-wrap items-baseline gap-1 text-xs">
      <span className="text-neutral-500">{layerLabels[layer]}</span>
      {shifts.length === 0 ? (
        <span className="text-neutral-400">{t.noShift}</span>
      ) : (
        shifts.flatMap((shift) =>
          shift.segments.map((segment) => (
            <span
              key={segment.id}
              className={`rounded px-1 tabular-nums ${
                segment.type.operative ? "bg-sky-50 text-sky-900" : "bg-violet-50 text-violet-900"
              }`}
            >
              {segment.type.operative ? "" : `${segment.type.code} `}
              {formatTimeOnDay(segment.start, day)}–{formatTimeOnDay(segment.end, day)}
            </span>
          )),
        )
      )}
    </span>
  );
}

function WeekNav({ weekStart, thisWeek }: { weekStart: string; thisWeek: string }) {
  const href = (date: string) => `/shifts?date=${date}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={href(addDays(weekStart, -DAYS))} className="btn btn-secondary">
        <span className="sm:hidden">‹</span>
        <span className="hidden sm:inline">{t.previousWeek}</span>
      </Link>
      <form action="/shifts" className="flex items-center gap-2">
        <label className="sr-only" htmlFor="date">
          {messages.dateNav.date}
        </label>
        <input id="date" type="date" name="date" defaultValue={weekStart} className="input w-auto py-1.5" />
        <button type="submit" className="btn btn-secondary">
          {messages.dateNav.show}
        </button>
      </form>
      <Link href={href(addDays(weekStart, DAYS))} className="btn btn-secondary">
        <span className="sm:hidden">›</span>
        <span className="hidden sm:inline">{t.nextWeek}</span>
      </Link>
      {weekStart !== thisWeek && (
        <Link href="/shifts" className="btn btn-secondary">
          {t.thisWeek}
        </Link>
      )}
    </div>
  );
}

export default async function RosterPage(props: PageProps<"/shifts">) {
  const user = await requireCapability(canViewRoster);
  const { date: dateValue } = await props.searchParams;
  const weekStart = startOfWeek(dateParam(dateValue));
  const days = Array.from({ length: DAYS }, (_, index) => addDays(weekStart, index));
  const layers = visibleLayers(user);
  const userIds = rosterVisibleUserIds(user);

  const weekEnd = addDays(weekStart, DAYS - 1);

  const [agents, shifts, publications] = await Promise.all([
    listRosterAgents(userIds),
    listShiftsInRange({ startLocalDate: weekStart, days: DAYS, layers, userIds }),
    listPublicationsInRange(weekStart, weekEnd),
  ]);
  const cells = groupByCell(shifts);
  const today = toLocalDate(new Date());

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{messages.pages.shifts}</h1>
          <p className="text-sm text-neutral-600">
            {fmt(t.week, { start: formatDayShort(weekStart), end: formatDayShort(weekEnd) })}
          </p>
        </div>
        {canManageSegmentTypes(user) && (
          <Link href="/shifts/types" className="btn btn-secondary">
            {messages.nav.segmentTypes}
          </Link>
        )}
      </div>
      <WeekNav weekStart={weekStart} thisWeek={startOfWeek(today)} />

      {canPublishRoster(user) && (
        <PublishForm action={publishPeriod} defaultStart={weekStart} defaultEnd={weekEnd} />
      )}

      {agents.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-600">
          {t.noAgents}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-600 uppercase">
              <tr>
                <th className="px-3 py-2">{t.agent}</th>
                {days.map((day) => (
                  <th key={day} className={`px-3 py-2 ${day === today ? "text-sky-800" : ""}`}>
                    {t.weekdays[weekdayIndex(day)]} {formatDayShort(day)}
                    {isPublished(day, publications) && (
                      <span className="ml-1 font-normal text-neutral-400 normal-case">{messages.publish.publishedDay}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {agents.map((agent) => (
                <tr key={agent.id}>
                  <td className="px-3 py-2 align-top font-medium">{agent.name}</td>
                  {days.map((day) => {
                    const inCell = cells.get(cellKey(agent.id, day)) ?? [];
                    const differs = !sameShifts(
                      inCell.filter((shift) => shift.layer === "PUBLISHED"),
                      inCell.filter((shift) => shift.layer === "ACTUAL"),
                    );
                    return (
                      <td key={day} className="align-top">
                        <Link
                          href={`/shifts/${agent.id}/${day}`}
                          title={differs ? t.differs : t.openCell}
                          className={`flex flex-col gap-0.5 px-3 py-2 hover:bg-neutral-50 ${
                            differs ? "border-l-2 border-amber-400 bg-amber-50" : ""
                          }`}
                        >
                          {layers.map((layer) => (
                            <LayerLine
                              key={layer}
                              layer={layer}
                              shifts={inCell.filter((shift) => shift.layer === layer)}
                              day={day}
                            />
                          ))}
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
