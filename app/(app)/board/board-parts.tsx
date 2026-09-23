import Link from "next/link";
import type { BoardBox, ConflictKind } from "@/lib/board";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { formatTimeOnDay } from "@/lib/time";
import type { TimeWindow } from "@/lib/turnaround";

const t = messages.board;

export interface Range {
  startMs: number;
  endMs: number;
}

export const LANE_LABEL_WIDTH = "w-44 shrink-0";

export function percent(range: Range, time: Date): number {
  return ((time.getTime() - range.startMs) / (range.endMs - range.startMs)) * 100;
}

function windowStyle(range: Range, window: TimeWindow) {
  const left = percent(range, window.start);
  const right = percent(range, window.end);
  return { left: `${Math.max(0, left)}%`, width: `${Math.min(100, right) - Math.max(0, left)}%` };
}

/** Pale background behind the agent's shift. */
export function ShiftBand({ range, window }: { range: Range; window: TimeWindow }) {
  return <div className="absolute inset-y-1 rounded bg-sky-50" style={windowStyle(range, window)} />;
}

export function conflictTitle(conflicts: readonly ConflictKind[]): string {
  return conflicts.map((kind) => t.conflicts[kind]).join(" · ");
}

export function TaskBox({ box, range, day }: { box: BoardBox; range: Range; day: string }) {
  const conflicted = box.conflicts.length > 0;
  const title = `${fmt(t.boxTitle, {
    flight: box.flightLabel,
    stand: box.stand,
    from: formatTimeOnDay(box.start, day),
    to: formatTimeOnDay(box.end, day),
  })}${conflicted ? ` · ${conflictTitle(box.conflicts)}` : ""}`;

  return (
    <Link
      href={`/tasks/${box.taskId}`}
      title={title}
      aria-label={title}
      style={windowStyle(range, box)}
      className={`absolute inset-y-1.5 z-10 flex flex-col justify-center overflow-hidden rounded-md border px-1.5 text-xs leading-tight ${
        conflicted
          ? "border-2 border-red-500 bg-red-50 text-red-900"
          : "border-sky-300 bg-sky-100 text-sky-900 hover:bg-sky-200"
      }`}
    >
      <span className="truncate font-semibold">{box.flightLabel}</span>
      <span className="truncate text-[11px] text-neutral-600">
        {box.stand} · {formatTimeOnDay(box.start, day)}
      </span>
    </Link>
  );
}
