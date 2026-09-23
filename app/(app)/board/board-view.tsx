"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, type DragEvent } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import type { ActionResult } from "@/lib/action";
import type { Board, BoardBlock, BoardBox, ConflictKind } from "@/lib/board";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { formatTime, formatTimeOnDay } from "@/lib/time";
import type { TimeWindow } from "@/lib/turnaround";
import { LANE_LABEL_WIDTH, percent, windowStyle, type Range } from "./board-layout";
import { NowLine } from "./now-line";

const t = messages.board;

/** The unassigned lane has no agent id. */
const UNASSIGNED = "";

type Action = (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;

function conflictTitle(conflicts: readonly ConflictKind[]): string {
  return conflicts.map((kind) => t.conflicts[kind]).join(" · ");
}

function TaskBox({
  box,
  range,
  day,
  draggable,
  onDragStart,
}: {
  box: BoardBox;
  range: Range;
  day: string;
  draggable: boolean;
  onDragStart: (event: DragEvent<HTMLAnchorElement>, box: BoardBox) => void;
}) {
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
      draggable={draggable}
      onDragStart={(event) => onDragStart(event, box)}
      style={windowStyle(range, box)}
      className={`absolute inset-y-1.5 z-10 flex flex-col justify-center overflow-hidden rounded-md border px-1.5 text-xs leading-tight ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      } ${
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

/** A non-operative segment: striped, behind the task boxes. */
function Block({ block, range, day }: { block: BoardBlock; range: Range; day: string }) {
  const title = [
    fmt(t.blockTitle, {
      label: block.label,
      from: formatTimeOnDay(block.segment.start, day),
      to: formatTimeOnDay(block.segment.end, day),
    }),
    fmt(t.blockWithTravel, { from: formatTimeOnDay(block.start, day), to: formatTimeOnDay(block.end, day) }),
    block.location,
    block.description,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      title={title}
      aria-label={title}
      style={windowStyle(range, block)}
      className="absolute inset-y-1 z-0 flex items-center overflow-hidden rounded border border-violet-300 bg-violet-100 px-1.5 text-[11px] leading-tight text-violet-900 [background-image:repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(124,58,237,0.18)_4px,rgba(124,58,237,0.18)_8px)]"
    >
      <span className="truncate font-medium">{block.label}</span>
    </div>
  );
}

function Lane({
  label,
  sublabel,
  range,
  day,
  boxes,
  shifts,
  blocks,
  emptyText,
  dropTarget,
  canAssign,
  onDragStart,
  onDrop,
}: {
  label: string;
  sublabel?: string;
  range: Range;
  day: string;
  boxes: BoardBox[];
  shifts?: TimeWindow[];
  blocks?: BoardBlock[];
  emptyText?: string;
  dropTarget: { id: string; active: boolean };
  canAssign: boolean;
  onDragStart: (event: DragEvent<HTMLAnchorElement>, box: BoardBox) => void;
  onDrop: (agentId: string, boxId: string) => void;
}) {
  const [over, setOver] = useState(false);

  return (
    <div className="flex border-b border-neutral-200 last:border-b-0">
      <div className={`${LANE_LABEL_WIDTH} border-r border-neutral-200 px-3 py-2`}>
        <div className="truncate font-medium">{label}</div>
        {sublabel && <div className="truncate text-xs text-orange-700">{sublabel}</div>}
      </div>
      <div
        // Both dragenter and dragover have to allow the drop, or some browsers
        // refuse it.
        onDragEnter={(event) => {
          if (!canAssign || !dropTarget.active) return;
          event.preventDefault();
          setOver(true);
        }}
        onDragOver={(event) => {
          if (!canAssign || !dropTarget.active) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          onDrop(dropTarget.id, event.dataTransfer.getData("text/plain"));
        }}
        className={`relative h-16 flex-1 transition-colors ${over ? "bg-sky-100" : "bg-neutral-50"}`}
      >
        {shifts?.map((shift, index) => (
          <div key={index} className="absolute inset-y-1 rounded bg-sky-50" style={windowStyle(range, shift)} />
        ))}
        {blocks?.map((block) => (
          <Block key={block.id} block={block} range={range} day={day} />
        ))}
        {boxes.map((box) => (
          <TaskBox key={box.id} box={box} range={range} day={day} draggable={canAssign} onDragStart={onDragStart} />
        ))}
        {boxes.length === 0 && !blocks?.length && emptyText && (
          <span className="absolute inset-0 flex items-center justify-center text-xs text-neutral-500">
            {over ? t.dropHere : emptyText}
          </span>
        )}
        <NowLine startMs={range.startMs} endMs={range.endMs} />
      </div>
    </div>
  );
}

export function BoardView({
  board,
  range,
  ticks,
  day,
  canAssign,
  action,
}: {
  board: Board;
  range: Range;
  ticks: Date[];
  day: string;
  canAssign: boolean;
  action: Action;
}) {
  const [result, formAction, pending] = useActionState(action, null);
  const [lastTarget, setLastTarget] = useState<string | null>(null);

  // The dragged box travels in the drag event itself (id = "<taskId>:<part>"),
  // so no component state has to be up to date when the drop fires.
  const onDragStart = (event: DragEvent<HTMLAnchorElement>, box: BoardBox) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", box.id);
  };

  const onDrop = (agentId: string, boxId: string) => {
    const separator = boxId.indexOf(":");
    if (!canAssign || separator < 0) return;

    const formData = new FormData();
    formData.set("taskId", boxId.slice(0, separator));
    formData.set("part", boxId.slice(separator + 1));
    formData.set("agentId", agentId);
    setLastTarget(agentId);
    startTransition(() => formAction(formData));
  };

  const successText =
    lastTarget === UNASSIGNED ? t.cleared : lastTarget === null ? undefined : t.assigned;

  return (
    <div className="flex flex-col gap-2">
      {canAssign && <p className="text-sm text-neutral-600">{t.dragHint}</p>}
      <div className={`overflow-x-auto rounded-xl border border-neutral-200 bg-white ${pending ? "opacity-70" : ""}`}>
        <div className="min-w-[60rem]">
          {/* Hour axis */}
          <div className="flex border-b border-neutral-200 bg-neutral-50">
            <div className={`${LANE_LABEL_WIDTH} border-r border-neutral-200`} />
            <div className="relative h-7 flex-1">
              {ticks.map((tick) => (
                <span
                  key={`line-${tick.toISOString()}`}
                  className="absolute inset-y-0 w-px bg-neutral-200"
                  style={{ left: `${percent(range, tick)}%` }}
                />
              ))}
              {ticks.map((tick) => (
                <span
                  key={tick.toISOString()}
                  className="absolute top-1 -translate-x-1/2 text-[11px] text-neutral-500 tabular-nums"
                  style={{ left: `${percent(range, tick)}%` }}
                >
                  {formatTime(tick)}
                </span>
              ))}
              <NowLine startMs={range.startMs} endMs={range.endMs} withLabel />
            </div>
          </div>

          <Lane
            label={t.unassigned}
            range={range}
            day={day}
            boxes={board.unassigned}
            emptyText={t.allAssigned}
            dropTarget={{ id: UNASSIGNED, active: true }}
            canAssign={canAssign}
            onDragStart={onDragStart}
            onDrop={onDrop}
          />

          {board.lanes.map((lane) => (
            <Lane
              key={lane.agent.id}
              label={lane.agent.name}
              sublabel={lane.hasShift ? undefined : t.noShift}
              range={range}
              day={day}
              boxes={lane.boxes}
              shifts={lane.shifts}
              blocks={lane.blocks}
              dropTarget={{ id: lane.agent.id, active: true }}
              canAssign={canAssign}
              onDragStart={onDragStart}
              onDrop={onDrop}
            />
          ))}
        </div>
      </div>
      <ActionFeedback result={result} successText={successText} />
    </div>
  );
}
