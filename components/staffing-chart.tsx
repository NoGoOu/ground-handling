import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { countTicks, hourMarks, raisedStepPath, runsOf, stepPath } from "@/lib/staffing/chart";
import type { StaffingDay } from "@/lib/staffing/day";
import { isShort } from "@/lib/staffing/summary";

// The step chart of the daily staffing view (CLAUDE.md, 9. mérföldkő,
// "Nézet"): the total demand and the demand per task type, the line of the
// roster, and the short bands highlighted. Plain SVG, drawn on the server.

const t = messages.staffing;

const WIDTH = 960;
const HEIGHT = 300;
const MARGIN = { left: 36, right: 12, top: 12, bottom: 28 };

/** One colour per task type, in the order of the legend. */
const TYPE_COLORS = ["#0284c7", "#d97706", "#7c3aed", "#db2777", "#0d9488", "#65a30d"];
export const typeColor = (index: number) => TYPE_COLORS[index % TYPE_COLORS.length];

/** How far a task type's line sits from the true value, in chart units: they fan out around it. */
const typeShift = (index: number, count: number) => (index - (count - 1) / 2) * 2.5;

const TOTAL_COLOR = "#171717";
const ROSTER_COLOR = "#059669";
const SHORT_COLOR = "#dc2626";

export function StaffingChart({ day, label }: { day: StaffingDay; label: string }) {
  const { bands } = day;
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const ticks = countTicks(Math.max(...bands.map((band) => Math.max(band.total, band.rostered))));
  const top = ticks.at(-1)!;
  const x = (index: number) => Math.round((MARGIN.left + (index * plotWidth) / bands.length) * 100) / 100;
  const y = (value: number) => Math.round((MARGIN.top + plotHeight - (value * plotHeight) / top) * 100) / 100;
  const short = (index: number) => isShort(day, bands[index]);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label} className="h-auto w-full min-w-[640px]">
        {/* The short bands, behind everything. */}
        {runsOf(bands.length, short).map(([from, to]) => (
          <rect key={from} x={x(from)} y={MARGIN.top} width={x(to) - x(from)} height={plotHeight} fill={SHORT_COLOR} opacity={0.08} />
        ))}

        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(tick)} y2={y(tick)} stroke="#e5e5e5" strokeWidth={1} />
            <text x={MARGIN.left - 6} y={y(tick) + 4} textAnchor="end" fontSize={11} fill="#737373">
              {tick}
            </text>
          </g>
        ))}
        {hourMarks(bands).map(({ index, label: hour }) => (
          <g key={index}>
            <line x1={x(index)} x2={x(index)} y1={MARGIN.top} y2={MARGIN.top + plotHeight + 4} stroke="#e5e5e5" strokeWidth={1} />
            <text x={x(index)} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill="#737373">
              {hour}
            </text>
          </g>
        ))}
        <text x={4} y={MARGIN.top + 4} fontSize={11} fill="#737373">
          {t.axisPeople}
        </text>

        {/* The total demand as an area, and what of it the roster does not cover. */}
        <path d={stepPath(bands.map((band) => band.total), x, y, 0)} fill="#d4d4d4" opacity={0.6} />
        {bands.map(
          (band, index) =>
            short(index) && (
              <rect
                key={index}
                x={x(index)}
                y={y(band.total)}
                width={x(index + 1) - x(index)}
                height={y(band.rostered) - y(band.total)}
                fill={SHORT_COLOR}
                opacity={0.45}
              />
            ),
        )}
        <path d={stepPath(bands.map((band) => band.total), x, y)} fill="none" stroke={TOTAL_COLOR} strokeWidth={3} strokeLinejoin="round" />
        {/* The task types on top, each a little off the others, so that equal values do not hide each other. */}
        {day.taskTypes.map((type, index) => (
          <path
            key={type}
            d={raisedStepPath(bands.map((band) => band.byType[type] ?? 0), x, y)}
            transform={`translate(${typeShift(index, day.taskTypes.length)} ${typeShift(index, day.taskTypes.length)})`}
            fill="none"
            stroke={typeColor(index)}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        ))}
        {day.hasRoster && (
          <path
            d={stepPath(bands.map((band) => band.rostered), x, y)}
            fill="none"
            stroke={ROSTER_COLOR}
            strokeWidth={2}
            strokeDasharray="7 4"
            strokeLinejoin="round"
          />
        )}
        <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(0)} y2={y(0)} stroke="#a3a3a3" strokeWidth={1} />
      </svg>
    </div>
  );
}

function Swatch({ color, dashed, area }: { color: string; dashed?: boolean; area?: boolean }) {
  return (
    <svg width={28} height={12} aria-hidden="true" className="shrink-0">
      {area ? (
        <rect x={0} y={1} width={28} height={10} fill={color} opacity={0.45} />
      ) : (
        <line x1={0} x2={28} y1={6} y2={6} stroke={color} strokeWidth={dashed ? 2 : 2.5} strokeDasharray={dashed ? "7 4" : undefined} />
      )}
    </svg>
  );
}

/** What the lines of the chart are; the names of the task types come with their codes. */
export function StaffingLegend({ day, names }: { day: StaffingDay; names: ReadonlyMap<string, string> }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-neutral-700">
      <li className="flex items-center gap-2">
        <Swatch color={TOTAL_COLOR} />
        {t.legendTotal}
      </li>
      {day.taskTypes.map((type, index) => (
        <li key={type} className="flex items-center gap-2">
          <Swatch color={typeColor(index)} />
          {fmt(t.legendType, { name: names.get(type) ?? type, code: type })}
        </li>
      ))}
      {day.hasRoster && (
        <>
          <li className="flex items-center gap-2">
            <Swatch color={ROSTER_COLOR} dashed />
            {t.legendRoster}
          </li>
          <li className="flex items-center gap-2">
            <Swatch color={SHORT_COLOR} area />
            {t.legendShortage}
          </li>
        </>
      )}
    </ul>
  );
}
