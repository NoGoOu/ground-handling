import Link from "next/link";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import type { StaffingDay } from "@/lib/staffing/day";
import { clockColumns, peakOfDays, type OverviewCell } from "@/lib/staffing/overview";
import { summaryOf } from "@/lib/staffing/summary";
import { balanceText, rosterNote } from "@/lib/staffing/texts";
import { formatDayShort, formatTime, weekdayIndex } from "@/lib/time";

// The overview of several days (CLAUDE.md, 9. mérföldkő, "Nézet"): a day ×
// band table of the total demand, coloured by how high it is, with the short
// bands in red; per day the peak with its time and the largest shortage.

const t = messages.staffing;

/** Blue for the demand, red for a short band; the darker, the more agents are needed. */
function cellStyle(cell: OverviewCell, max: number): { backgroundColor?: string; color?: string } {
  if (cell.total === 0 && !cell.short) return {};
  const strength = 0.18 + 0.72 * (cell.total / max);
  const [r, g, b] = cell.short ? [220, 38, 38] : [2, 132, 199];
  return { backgroundColor: `rgba(${r}, ${g}, ${b}, ${strength.toFixed(2)})`, color: strength > 0.5 ? "#fff" : "#171717" };
}

function cellTitle(day: StaffingDay, cell: OverviewCell): string {
  const base = day.hasRoster
    ? fmt(t.cellTitle, { time: formatTime(cell.start), total: cell.total, rostered: cell.rostered, balance: balanceText(day, cell) })
    : fmt(t.cellTitleNoRoster, { time: formatTime(cell.start), total: cell.total });
  return cell.doubled ? `${base}\n${t.cellDoubled}` : base;
}

const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
/** Narrow enough for the 96 quarter hours of a day to fit the page without scrolling sideways. */
const CELL = "h-6 w-[9px] min-w-[9px] p-0 text-center text-[8px] leading-6 tracking-tighter";
/** The mark of a day whose roster is the draft (9. mérföldkő, utómunka). */
const DRAFT_MARK = "ml-1 inline-block rounded bg-violet-100 px-1 text-[10px] leading-4 font-semibold text-violet-800";

/** A line between the hours, so that the eye finds its way along a row. */
const hourEdge = (column: number) => (column % 4 === 0 ? "border-l border-neutral-300" : "");

export function StaffingOverview({ days }: { days: readonly StaffingDay[] }) {
  const max = peakOfDays(days);
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="border-collapse text-sm tabular-nums">
          <thead className="text-xs text-neutral-500">
            <tr>
              <th className="sticky left-0 z-10 bg-white py-1 pr-2 text-left font-normal">{t.day}</th>
              <th className="py-1 pr-2 text-left font-normal whitespace-nowrap">{t.dayPeak}</th>
              <th className="py-1 pr-2 text-left font-normal whitespace-nowrap">{t.dayShortage}</th>
              {HOURS.map((hour) => (
                <th key={hour} colSpan={4} className="border-l border-neutral-300 px-0 py-1 text-left font-normal">
                  <span className="pl-0.5">{hour}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => {
              const summary = summaryOf(day);
              return (
                <tr key={day.day} className="border-t border-neutral-200">
                  <th className="sticky left-0 z-10 bg-white py-0.5 pr-2 text-left font-medium whitespace-nowrap">
                    <Link href={`/staffing?date=${day.day}`} className="text-sky-700 hover:underline" title={fmt(t.openDay, { date: day.day })}>
                      {messages.roster.weekdays[weekdayIndex(day.day)]} {formatDayShort(day.day)}
                    </Link>
                    {day.rosterLayer === "DRAFT" && (
                      <span title={t.draftLegend} className={DRAFT_MARK}>
                        {t.draftMark}
                      </span>
                    )}
                  </th>
                  <td className="py-0.5 pr-2 whitespace-nowrap">
                    {summary.peakAt ? fmt(t.dayPeakValue, { n: summary.peak, time: formatTime(summary.peakAt) }) : t.none}
                  </td>
                  <td className="py-0.5 pr-2 whitespace-nowrap">
                    {!day.hasRoster ? (
                      <span className="text-neutral-500" title={rosterNote(day) ?? undefined}>
                        {t.noRosterMark}
                      </span>
                    ) : summary.shortageAt ? (
                      <span className="font-semibold text-red-700">
                        {fmt(t.dayShortageValue, { n: summary.shortage, time: formatTime(summary.shortageAt) })}
                      </span>
                    ) : (
                      t.none
                    )}
                  </td>
                  {clockColumns(day).map((cell, column) =>
                    cell ? (
                      <td
                        key={column}
                        title={cellTitle(day, cell)}
                        style={cellStyle(cell, max)}
                        className={`${CELL} ${hourEdge(column)} ${cell.doubled ? "underline decoration-dotted" : ""}`}
                      >
                        {cell.total > 0 ? cell.total : cell.doubled ? "·" : ""}
                      </td>
                    ) : (
                      <td key={column} title={t.cellMissing} className={`${CELL} ${hourEdge(column)} bg-neutral-200 text-neutral-400`}>
                        ×
                      </td>
                    ),
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-neutral-700">
        <li className="flex items-center gap-2">
          <span className="flex">
            {[0.25, 0.5, 0.75, 1].map((ratio) => (
              <span key={ratio} className="inline-block h-4 w-4" style={cellStyle({ total: ratio * max, short: false } as OverviewCell, max)} />
            ))}
          </span>
          {fmt(t.legendDemand, { max })}
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block h-4 w-4" style={cellStyle({ total: max, short: true } as OverviewCell, max)} />
          {t.legendShort}
        </li>
        {days.some((day) => day.rosterLayer === "DRAFT") && (
          <li className="flex items-center gap-2">
            <span className={DRAFT_MARK}>{t.draftMark}</span>
            {t.draftLegend}
          </li>
        )}
        {days.some((day) => !day.hasRoster) && (
          <li className="flex items-center gap-2">
            <span className="inline-block w-4 text-center text-neutral-500">{t.noRosterMark}</span>
            {t.noRosterLegend}
          </li>
        )}
        {days.some((day) => day.bands.length > 96) && (
          <li className="flex items-center gap-2">
            <span className="inline-block w-4 text-center underline decoration-dotted">2</span>
            {t.legendDoubled}
          </li>
        )}
        {days.some((day) => day.bands.length < 96) && (
          <li className="flex items-center gap-2">
            <span className="inline-block h-4 w-4 bg-neutral-200 text-center text-xs leading-4 text-neutral-400">×</span>
            {t.legendMissing}
          </li>
        )}
      </ul>
    </div>
  );
}
