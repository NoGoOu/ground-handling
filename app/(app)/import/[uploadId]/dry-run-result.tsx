import type { DryRunView, GroupKind, SummaryKey } from "@/lib/import/dry-run-view";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";

const t = messages.import.dryRun;

const SUMMARY_STYLE: Record<SummaryKey, string> = {
  new: "bg-emerald-50 text-emerald-900",
  changed: "bg-sky-50 text-sky-900",
  repaired: "bg-sky-50 text-sky-900",
  unchanged: "bg-neutral-50 text-neutral-800",
  conflicts: "bg-amber-50 text-amber-900",
  errors: "bg-red-50 text-red-900",
  unpaired: "bg-teal-50 text-teal-900",
  missing: "bg-orange-50 text-orange-900",
};

/** Groups that need a look are open; the long, uneventful ones are folded. */
const OPEN: Record<GroupKind, boolean> = {
  error: true,
  conflict: true,
  changed: true,
  missing: true,
  warning: true,
  new: false,
  unchanged: false,
};

export function DryRunResult({ view, station }: { view: DryRunView; station: string }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">{t.title}</h2>
        <span className="text-sm text-neutral-600">{t.nothingWritten}</span>
      </div>
      <p className="text-sm text-neutral-600">
        {view.period ? fmt(t.period, view.period) : t.noPeriod}
        {!view.missingChecked && <> · {t.noProfile}</>}
      </p>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-9">
        {(Object.keys(view.summary) as SummaryKey[]).map((key) => (
          <div key={key} className={`flex flex-col rounded-lg px-3 py-2 ${SUMMARY_STYLE[key]}`}>
            <dt className="text-xs">{t.summary[key]}</dt>
            <dd className="text-xl font-semibold tabular-nums">{view.summary[key]}</dd>
          </div>
        ))}
        <div className="flex flex-col rounded-lg bg-neutral-50 px-3 py-2 text-neutral-600">
          <dt className="text-xs">{fmt(t.summary.filtered, { station })}</dt>
          <dd className="text-xl font-semibold tabular-nums">
            {view.filteredRows}
            <span className="text-sm font-normal"> / {view.totalRows}</span>
          </dd>
        </div>
      </dl>

      {view.groups.map((group) => (
        <details key={group.kind} open={OPEN[group.kind]} className="rounded-lg border border-neutral-200">
          <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">
            {t.groups[group.kind]} ({group.rows.length + group.more})
          </summary>
          <div className="overflow-x-auto border-t border-neutral-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  {group.columns.map((column) => (
                    <th key={column} className="px-2 py-1.5 whitespace-nowrap">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {group.rows.map((row, index) => (
                  <tr key={index}>
                    {row.map((cell, column) => (
                      <td key={column} className={`px-2 py-1 ${column === 0 ? "font-medium" : ""} tabular-nums`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {group.more > 0 && <p className="px-3 py-2 text-xs text-neutral-500">{fmt(t.more, { count: group.more })}</p>}
          </div>
        </details>
      ))}
    </section>
  );
}
