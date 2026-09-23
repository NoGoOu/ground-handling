import { DateNav } from "@/components/date-nav";
import { boardRange, hourTicks, type BoardBox, type BoardLane } from "@/lib/board";
import { getBoardForDay } from "@/lib/data/board";
import { messages } from "@/lib/messages";
import { canManageShifts } from "@/lib/permissions";
import { dateParam } from "@/lib/search-params";
import { requireCapability } from "@/lib/session";
import { formatTime, localDayRange, toLocalDate } from "@/lib/time";
import { LANE_LABEL_WIDTH, percent, ShiftBand, TaskBox, type Range } from "./board-parts";
import { NowLine } from "./now-line";

const t = messages.board;

function Lane({
  label,
  sublabel,
  range,
  day,
  boxes,
  shifts,
  emptyText,
}: {
  label: string;
  sublabel?: string;
  range: Range;
  day: string;
  boxes: BoardBox[];
  shifts?: { start: Date; end: Date }[];
  emptyText?: string;
}) {
  return (
    <div className="flex border-b border-neutral-200 last:border-b-0">
      <div className={`${LANE_LABEL_WIDTH} border-r border-neutral-200 px-3 py-2`}>
        <div className="truncate font-medium">{label}</div>
        {sublabel && <div className="truncate text-xs text-orange-700">{sublabel}</div>}
      </div>
      <div className="relative h-16 flex-1 bg-neutral-50">
        {shifts?.map((shift, index) => (
          <ShiftBand key={index} range={range} window={shift} />
        ))}
        {boxes.map((box) => (
          <TaskBox key={box.id} box={box} range={range} day={day} />
        ))}
        {boxes.length === 0 && emptyText && (
          <span className="absolute inset-0 flex items-center justify-center text-xs text-neutral-500">
            {emptyText}
          </span>
        )}
        <NowLine startMs={range.startMs} endMs={range.endMs} />
      </div>
    </div>
  );
}

export default async function BoardPage(props: PageProps<"/board">) {
  await requireCapability(canManageShifts);
  const { date: dateValue } = await props.searchParams;
  const date = dateParam(dateValue);
  const board = await getBoardForDay(date);

  const allWindows = [
    ...board.unassigned,
    ...board.lanes.flatMap((lane: BoardLane) => [...lane.boxes, ...lane.shifts]),
  ];
  const window = boardRange(localDayRange(date), allWindows);
  const range: Range = { startMs: window.start.getTime(), endMs: window.end.getTime() };
  const ticks = hourTicks(window);
  const hasAnything = board.lanes.length > 0 || board.unassigned.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{messages.pages.board}</h1>
      <DateNav basePath="/board" date={date} today={toLocalDate(new Date())} />
      <p className="text-sm text-neutral-600">{t.legend}</p>

      {!hasAnything ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-600">{t.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <div className="min-w-[60rem]">
            {/* Hour axis */}
            <div className="flex border-b border-neutral-200 bg-neutral-50">
              <div className={`${LANE_LABEL_WIDTH} border-r border-neutral-200`} />
              <div className="relative h-7 flex-1">
                {ticks.map((tick) => (
                  <span
                    key={tick.toISOString()}
                    className="absolute top-1 -translate-x-1/2 text-[11px] text-neutral-500 tabular-nums"
                    style={{ left: `${percent(range, tick)}%` }}
                  >
                    {formatTime(tick)}
                  </span>
                ))}
                {ticks.map((tick) => (
                  <span
                    key={`line-${tick.toISOString()}`}
                    className="absolute inset-y-0 w-px bg-neutral-200"
                    style={{ left: `${percent(range, tick)}%` }}
                  />
                ))}
                <NowLine startMs={range.startMs} endMs={range.endMs} withLabel />
              </div>
            </div>

            <Lane
              label={t.unassigned}
              range={range}
              day={date}
              boxes={board.unassigned}
              emptyText={t.allAssigned}
            />

            {board.lanes.map((lane) => (
              <Lane
                key={lane.agent.id}
                label={lane.agent.name}
                sublabel={lane.hasShift ? undefined : t.noShift}
                range={range}
                day={date}
                boxes={lane.boxes}
                shifts={lane.shifts}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
