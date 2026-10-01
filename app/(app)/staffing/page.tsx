import { DateNav } from "@/components/date-nav";
import { StaffingChart, StaffingLegend } from "@/components/staffing-chart";
import { StaffingTable } from "@/components/staffing-table";
import { loadStaffing } from "@/lib/data/staffing";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canViewLayer, canViewStaffing } from "@/lib/permissions";
import { dateParam } from "@/lib/search-params";
import { requireCapability } from "@/lib/session";
import { summaryOf } from "@/lib/staffing/summary";
import { formatTime, toLocalDate } from "@/lib/time";
import { StaffingViews } from "./views";

// The daily view of the staffing demand (CLAUDE.md, 9. mérföldkő, "Nézet"):
// a step chart of the demand and the roster, and under it the table per band.
// Made for a desktop; on a phone it scrolls sideways.

const t = messages.staffing;

export default async function StaffingPage(props: PageProps<"/staffing">) {
  const user = await requireCapability(canViewStaffing);
  const { date: dateValue } = await props.searchParams;
  const date = dateParam(dateValue);
  const { days, taskTypeNames } = await loadStaffing(date, date, { draft: canViewLayer(user, "DRAFT") });
  const [day] = days;
  const summary = summaryOf(day);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{messages.pages.staffing}</h1>
      <StaffingViews active="daily" date={date} />
      <DateNav basePath="/staffing" date={date} today={toLocalDate(new Date())} />
      <p className="max-w-3xl text-sm text-neutral-600">{t.hint}</p>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <p className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className="font-medium">
            {summary.peakAt ? fmt(t.peak, { n: summary.peak, time: formatTime(summary.peakAt) }) : t.noPeak}
          </span>
          {day.hasRoster &&
            (summary.shortageAt ? (
              <span className="font-medium text-red-700">
                {fmt(t.worst, { n: summary.shortage, time: formatTime(summary.shortageAt), bands: summary.shortBands })}
              </span>
            ) : (
              <span className="text-emerald-700">{t.noShortage}</span>
            ))}
        </p>
        {!day.hasRoster && (
          <p role="status" className="text-sm text-orange-700">
            {t.noRoster}
          </p>
        )}
        {day.bands.length !== 96 && <p className="text-sm text-neutral-600">{fmt(t.dstNote, { count: day.bands.length })}</p>}
        {summary.peak === 0 && <p className="text-sm text-neutral-600">{t.noDemand}</p>}
        <StaffingChart day={day} label={fmt(t.chartLabel, { date })} />
        <StaffingLegend day={day} names={taskTypeNames} />
      </section>

      <section className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{t.tableTitle}</h2>
        <p className="text-sm text-neutral-600">{t.tableHint}</p>
        <StaffingTable day={day} />
      </section>
    </div>
  );
}
