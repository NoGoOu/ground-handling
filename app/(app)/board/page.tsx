import { DateNav } from "@/components/date-nav";
import { boardRange, hourTicks } from "@/lib/board";
import { getBoardForDay } from "@/lib/data/board";
import { messages } from "@/lib/messages";
import { canAssignTasks, canViewBoard } from "@/lib/permissions";
import { dateParam } from "@/lib/search-params";
import { requireCapability } from "@/lib/session";
import { localDayRange, toLocalDate } from "@/lib/time";
import { assignBox } from "./actions";
import { BoardView } from "./board-view";

const t = messages.board;

export default async function BoardPage(props: PageProps<"/board">) {
  const user = await requireCapability(canViewBoard);
  const { date: dateValue } = await props.searchParams;
  const date = dateParam(dateValue);
  const board = await getBoardForDay(date);

  const allWindows = [...board.unassigned, ...board.lanes.flatMap((lane) => [...lane.boxes, ...lane.shifts])];
  const window = boardRange(localDayRange(date), allWindows);
  const range = { startMs: window.start.getTime(), endMs: window.end.getTime() };
  const hasAnything = board.lanes.length > 0 || board.unassigned.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{messages.pages.board}</h1>
      <DateNav basePath="/board" date={date} today={toLocalDate(new Date())} />
      <p className="text-sm text-neutral-600">{t.legend}</p>

      {!hasAnything ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-600">{t.empty}</p>
      ) : (
        <BoardView
          board={board}
          range={range}
          ticks={hourTicks(window)}
          day={date}
          canAssign={canAssignTasks(user)}
          action={assignBox.bind(null, date)}
        />
      )}
    </div>
  );
}
