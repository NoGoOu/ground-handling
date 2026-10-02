import Link from "next/link";
import { castsBlock, blockWindow } from "@/lib/board";
import type { RosterShift } from "@/lib/data/shifts";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { formatChangeTime, shiftsSpan, timeSpan, type OwnRosterDay } from "@/lib/roster";
import { formatDayShort, formatTimeOnDay, weekdayIndex } from "@/lib/time";

// One day of the agent's own roster (CLAUDE.md, 12. mérföldkő): the shift, the
// difference from the published one, and the segments. Used by "Beosztásom"
// and by the daily summary above the agent's tasks.

const r = messages.myRoster;

export type RosterDayView = OwnRosterDay<RosterShift>;

/** The day at a glance: the actual shift's times, "Szabad", or "Még nincs publikálva". */
export function rosterHeadline(day: RosterDayView): { text: string; muted: boolean } {
  if (!day.published) return { text: r.notPublished, muted: true };
  const span = shiftsSpan(day.actualShifts, day.day);
  return span ? { text: span, muted: false } : { text: r.free, muted: true };
}

/** "Publikált: 06:00–14:00 → Valós: 08:00–16:00, módosult: 10. 02. 07:30" where the layers differ. */
export function RosterDifference({ day }: { day: RosterDayView }) {
  if (!day.differs) return null;
  return (
    <p className="rounded-lg border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-amber-950">
      {fmt(r.differs, {
        published: shiftsSpan(day.publishedShifts, day.day) ?? r.freeShort,
        actual: shiftsSpan(day.actualShifts, day.day) ?? r.freeShort,
      })}
      {day.changedAt && fmt(r.changed, { time: formatChangeTime(day.changedAt) })}
    </p>
  );
}

/** The segments of a day's shifts: type, times, location, description, and the block with travel. */
export function SegmentList({ shifts, day, muted = false }: { shifts: RosterShift[]; day: string; muted?: boolean }) {
  const segments = shifts.flatMap((shift) => shift.segments);
  return (
    <ul className={`flex flex-col gap-2 ${muted ? "text-neutral-500" : ""}`}>
      {segments.map((segment) => {
        const block = castsBlock({ operative: segment.type.operative, createBlock: segment.createBlock }) ? blockWindow(segment) : null;
        return (
          <li key={segment.id} className="flex flex-col">
            <span>
              <span className="font-medium">{segment.type.name}</span>{" "}
              <span className="tabular-nums">{timeSpan(segment.start, segment.end, day)}</span>
            </span>
            {segment.location && <span className="text-sm">{segment.location}</span>}
            {segment.description && <span className="text-sm text-neutral-600">{segment.description}</span>}
            {block && (
              <span className="text-sm text-violet-800">
                {fmt(r.block, { from: formatTimeOnDay(block.start, day), to: formatTimeOnDay(block.end, day) })}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** A day of "Beosztásom": tapping it opens the segments. */
export function RosterDayCard({ day, today }: { day: RosterDayView; today: string }) {
  const headline = rosterHeadline(day);
  const parts = day.actualShifts.some((s) => s.segments.length > 0) || (day.differs && day.publishedShifts.length > 0);
  const header = (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="flex items-baseline gap-2">
          <span className="text-lg font-semibold">{r.weekdays[weekdayIndex(day.day)]}</span>
          <span className="text-neutral-600 tabular-nums">{formatDayShort(day.day)}</span>
          {day.day === today && <span className="rounded bg-sky-100 px-1.5 text-xs font-semibold text-sky-800">{r.today}</span>}
        </span>
        <span className={headline.muted ? "text-base text-neutral-500" : "text-xl font-bold tabular-nums"}>{headline.text}</span>
      </div>
      <RosterDifference day={day} />
    </>
  );
  const frame = `rounded-xl border bg-white shadow-sm ${day.day === today ? "border-sky-300" : "border-neutral-200"}`;

  if (!parts) return <li className={`${frame} flex flex-col gap-2 p-4`}>{header}</li>;
  return (
    <li className={frame}>
      <details className="group">
        <summary className="flex cursor-pointer list-none flex-col gap-2 p-4 [&::-webkit-details-marker]:hidden">
          {header}
          <span className="flex items-center gap-1 text-sm text-sky-700">
            {r.showParts}
            <span aria-hidden="true" className="transition-transform group-open:rotate-180">
              ▾
            </span>
          </span>
        </summary>
        <div className="flex flex-col gap-3 border-t border-neutral-100 px-4 py-3">
          {day.actualShifts.length > 0 && (
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold text-neutral-600">{r.segments}</h3>
              <SegmentList shifts={day.actualShifts} day={day.day} />
            </div>
          )}
          {day.differs && day.publishedShifts.length > 0 && (
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold text-neutral-600">{r.publishedSegments}</h3>
              <SegmentList shifts={day.publishedShifts} day={day.day} muted />
            </div>
          )}
        </div>
      </details>
    </li>
  );
}

/**
 * The day's shift above the agent's tasks (CLAUDE.md, 12. mérföldkő, "Napi
 * összefoglaló"): its times, the blocks with travel, and the difference.
 */
export function RosterDaySummary({ day }: { day: RosterDayView }) {
  const headline = rosterHeadline(day);
  const blocks = day.actualShifts
    .flatMap((shift) => shift.segments)
    .filter((segment) => castsBlock({ operative: segment.type.operative, createBlock: segment.createBlock }));
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-semibold">{r.summaryTitle}</h2>
        <span className={headline.muted ? "text-base text-neutral-500" : "text-xl font-bold tabular-nums"}>{headline.text}</span>
      </div>
      <RosterDifference day={day} />
      {blocks.length > 0 && (
        <ul className="flex flex-col gap-1">
          {blocks.map((segment) => {
            const block = blockWindow(segment);
            return (
              <li key={segment.id} className="text-violet-900">
                <span className="font-medium">{segment.type.name}</span>{" "}
                <span className="tabular-nums">{timeSpan(segment.start, segment.end, day.day)}</span>
                <span className="text-sm text-violet-800">
                  {" · "}
                  {fmt(r.block, { from: formatTimeOnDay(block.start, day.day), to: formatTimeOnDay(block.end, day.day) })}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <Link href={`/agent/roster?date=${day.day}`} className="self-start text-sm text-sky-700 hover:underline">
        {r.open}
      </Link>
    </section>
  );
}
