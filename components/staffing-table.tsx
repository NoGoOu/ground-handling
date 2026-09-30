import { typeColor } from "@/components/staffing-chart";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import type { StaffingDay } from "@/lib/staffing/day";
import { shortageOf, surplusOf, type StaffingBand } from "@/lib/staffing/roster";
import { isShort } from "@/lib/staffing/summary";
import { formatTime } from "@/lib/time";

// The table under the chart of the daily staffing view (CLAUDE.md, 9.
// mérföldkő, "Nézet"): per band the time, the demand per task type and in
// total, the roster, and the shortage or the surplus.

const t = messages.staffing;

/** "−2 hiány", "+1 többlet" or "0"; a dash on a day without an actual roster. */
export function balanceText(day: Pick<StaffingDay, "hasRoster">, band: Pick<StaffingBand, "balance">): string {
  if (!day.hasRoster) return t.noBalance;
  if (band.balance < 0) return fmt(t.shortage, { n: shortageOf(band) });
  if (band.balance > 0) return fmt(t.surplus, { n: surplusOf(band) });
  return t.even;
}

export function StaffingTable({ day }: { day: StaffingDay }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-left text-sm tabular-nums">
        <thead className="sticky top-0 bg-white text-xs text-neutral-500">
          <tr className="border-b border-neutral-200">
            <th className="py-1.5 pr-3 font-normal">{t.band}</th>
            {day.taskTypes.map((type, index) => (
              <th key={type} className="py-1.5 pr-3 text-right font-mono font-normal" style={{ color: typeColor(index) }}>
                {type}
              </th>
            ))}
            <th className="py-1.5 pr-3 text-right font-semibold text-neutral-700">{t.total}</th>
            <th className="py-1.5 pr-3 text-right font-normal">{t.rostered}</th>
            <th className="py-1.5 font-normal">{t.balance}</th>
          </tr>
        </thead>
        <tbody>
          {day.bands.map((band) => {
            const short = isShort(day, band);
            const idle = band.total === 0 && band.rostered === 0;
            return (
              <tr
                key={band.start.getTime()}
                className={`border-b border-neutral-100 ${short ? "bg-red-50" : ""} ${idle ? "text-neutral-400" : ""}`}
              >
                <td className="py-0.5 pr-3">
                  {formatTime(band.start)}–{formatTime(band.end)}
                </td>
                {day.taskTypes.map((type) => (
                  <td key={type} className="py-0.5 pr-3 text-right">
                    {band.byType[type] ?? 0}
                  </td>
                ))}
                <td className="py-0.5 pr-3 text-right font-semibold">{band.total}</td>
                <td className="py-0.5 pr-3 text-right">{day.hasRoster ? band.rostered : t.noBalance}</td>
                <td className={`py-0.5 ${short ? "font-semibold text-red-700" : band.balance > 0 && day.hasRoster ? "text-emerald-700" : ""}`}>
                  {balanceText(day, band)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
