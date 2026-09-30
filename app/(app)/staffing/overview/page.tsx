import Link from "next/link";
import { FormMessage } from "@/components/form-field";
import { StaffingOverview } from "@/components/staffing-overview";
import { loadStaffing } from "@/lib/data/staffing";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canViewStaffing } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { overviewPeriod, shiftPeriod } from "@/lib/staffing/overview";
import { toLocalDate } from "@/lib/time";
import { StaffingViews } from "../views";

// The overview of the staffing demand (CLAUDE.md, 9. mérföldkő, "Nézet"): at
// most 31 days, a row per day. The period is a plain GET form, so it works
// without JavaScript and can be linked to.

const t = messages.staffing;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const periodHref = (period: { from: string; to: string }) => `/staffing/overview?from=${period.from}&to=${period.to}`;

export default async function StaffingOverviewPage(props: PageProps<"/staffing/overview">) {
  await requireCapability(canViewStaffing);
  const { from, to } = await props.searchParams;
  const period = overviewPeriod(first(from), first(to), toLocalDate(new Date()));
  // A refused period loads nothing: the form shows why.
  const staffing = period.problem ? null : await loadStaffing(period.from, period.to);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{messages.pages.staffing}</h1>
      <StaffingViews active="overview" />

      <div className="flex flex-wrap items-end gap-2">
        <form action="/staffing/overview" className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-700">{t.period.from}</span>
            <input type="date" name="from" defaultValue={period.from} className="input w-auto py-1.5" required />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-700">{t.period.to}</span>
            <input type="date" name="to" defaultValue={period.to} className="input w-auto py-1.5" required />
          </label>
          <button type="submit" className="btn btn-secondary">
            {t.period.show}
          </button>
        </form>
        {!period.problem && (
          <>
            <Link href={periodHref(shiftPeriod(period, -1))} className="btn btn-secondary">
              {t.period.previous}
            </Link>
            <Link href={periodHref(shiftPeriod(period, 1))} className="btn btn-secondary">
              {t.period.next}
            </Link>
          </>
        )}
        <Link href="/staffing/overview" className="btn btn-secondary">
          {t.period.reset}
        </Link>
      </div>
      {period.problem && <FormMessage message={fmt(t.period.problems[period.problem], { days: period.days })} />}
      <p className="max-w-3xl text-sm text-neutral-600">{t.overviewHint}</p>

      {staffing && (
        <section className="rounded-xl border border-neutral-200 bg-white p-4">
          <StaffingOverview days={staffing.days} />
        </section>
      )}
    </div>
  );
}
