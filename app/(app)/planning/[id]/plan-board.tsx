"use client";

import { startTransition, useActionState, useState, type DragEvent } from "react";
import { LANE_LABEL_WIDTH, percent, windowStyle, type Range } from "@/app/(app)/board/board-layout";
import { NowLine } from "@/app/(app)/board/now-line";
import { ActionFeedback } from "@/components/action-feedback";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import type { PlanBox, PlanLane } from "@/lib/planning/view";
import { formatTime, formatTimeOnDay } from "@/lib/time";

// The plan day on the band view (CLAUDE.md, 4. mérföldkő, "Folyamat" 4): a
// lane per position. A box dragged onto another lane moves the task there;
// the "Új pozíció" lane opens a new position.

const t = messages.planning.plan;
const NEW_POSITION = "new";

type Action = (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;

function Box({
  box,
  range,
  day,
  broken,
  draggable,
}: {
  box: PlanBox;
  range: Range;
  day: string;
  broken: boolean;
  draggable: boolean;
}) {
  const title = [
    fmt(t.boxTitle, {
      flight: box.flightLabel,
      stand: box.stand,
      from: formatTimeOnDay(box.start, day),
      to: formatTimeOnDay(box.end, day),
    }),
    box.manual ? t.manualMark : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div
      title={title}
      aria-label={title}
      draggable={draggable}
      onDragStart={(event: DragEvent<HTMLDivElement>) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", box.itemId);
      }}
      style={windowStyle(range, box)}
      className={`absolute inset-y-1.5 z-10 flex flex-col justify-center overflow-hidden rounded-md border px-1.5 text-xs leading-tight ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      } ${box.manual ? "border-dashed" : ""} ${
        broken ? "border-2 border-red-500 bg-red-50 text-red-900" : "border-sky-400 bg-sky-100 text-sky-900 hover:bg-sky-200"
      }`}
    >
      <span className="truncate font-semibold">{box.flightLabel}</span>
      <span className="truncate text-[11px] text-neutral-600">
        {box.stand} · {formatTimeOnDay(box.start, day)}
      </span>
    </div>
  );
}

function Lane({
  label,
  sublabel,
  problems,
  range,
  day,
  lane,
  target,
  canEdit,
  emptyText,
  onDrop,
}: {
  label: string;
  sublabel?: string | null;
  problems?: string[];
  range: Range;
  day: string;
  lane: PlanLane | null;
  target: string;
  canEdit: boolean;
  emptyText?: string;
  onDrop: (target: string, itemId: string) => void;
}) {
  const [over, setOver] = useState(false);
  const broken = !!problems?.length;
  return (
    <div className="flex border-b border-neutral-200 last:border-b-0">
      <div className={`${LANE_LABEL_WIDTH} border-r border-neutral-200 px-3 py-2`}>
        <div className="truncate font-medium">{label}</div>
        {sublabel && <div className="truncate text-xs text-neutral-600">{sublabel}</div>}
        {problems?.map((problem) => (
          <div key={problem} className="truncate text-xs text-red-700" title={problem}>
            ⚠ {problem}
          </div>
        ))}
      </div>
      <div
        onDragEnter={(event) => {
          if (!canEdit) return;
          event.preventDefault();
          setOver(true);
        }}
        onDragOver={(event) => {
          if (!canEdit) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          onDrop(target, event.dataTransfer.getData("text/plain"));
        }}
        className={`relative h-16 flex-1 transition-colors ${over ? "bg-sky-100" : "bg-neutral-50"}`}
      >
        {lane && (
          <div
            className="absolute inset-y-1 rounded bg-sky-50 ring-1 ring-sky-200"
            style={windowStyle(range, lane.shift)}
            title={fmt(t.shiftTitle, { from: formatTimeOnDay(lane.shift.start, day), to: formatTimeOnDay(lane.shift.end, day) })}
          />
        )}
        {lane?.break && (
          <div
            className="absolute inset-y-1 z-0 flex items-end justify-center overflow-hidden rounded border border-amber-300 bg-amber-50 text-[10px] text-amber-800 [background-image:repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(217,119,6,0.18)_4px,rgba(217,119,6,0.18)_8px)]"
            style={windowStyle(range, lane.break)}
            title={fmt(t.breakTitle, { from: formatTimeOnDay(lane.break.start, day), to: formatTimeOnDay(lane.break.end, day) })}
          >
            {t.breakLabel}
          </div>
        )}
        {lane?.boxes.map((box) => (
          <Box key={box.itemId} box={box} range={range} day={day} broken={broken} draggable={canEdit} />
        ))}
        {!lane && emptyText && (
          <span className="absolute inset-0 flex items-center justify-center text-xs text-neutral-500">{emptyText}</span>
        )}
        <NowLine startMs={range.startMs} endMs={range.endMs} />
      </div>
    </div>
  );
}

export function PlanBoard({
  lanes,
  range,
  ticks,
  day,
  canEdit,
  action,
}: {
  lanes: PlanLane[];
  range: Range;
  ticks: Date[];
  day: string;
  canEdit: boolean;
  action: Action;
}) {
  const [result, formAction, pending] = useActionState(action, null);

  const onDrop = (target: string, itemId: string) => {
    if (!canEdit || !itemId) return;
    const formData = new FormData();
    formData.set("itemId", itemId);
    formData.set("positionId", target);
    startTransition(() => formAction(formData));
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-neutral-600">{canEdit ? t.dragHint : t.readOnly}</p>
      <div className={`overflow-x-auto rounded-xl border border-neutral-200 bg-white ${pending ? "opacity-70" : ""}`}>
        <div className="min-w-[60rem]">
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

          {lanes.map((lane) => (
            <Lane
              key={lane.positionId}
              label={fmt(t.position, { number: lane.number })}
              sublabel={lane.userName}
              problems={lane.violations.map((v) => t.violations[v])}
              range={range}
              day={day}
              lane={lane}
              target={lane.positionId}
              canEdit={canEdit}
              onDrop={onDrop}
            />
          ))}
          {canEdit && (
            <Lane
              label={t.newPosition}
              range={range}
              day={day}
              lane={null}
              target={NEW_POSITION}
              canEdit={canEdit}
              emptyText={t.newPositionHint}
              onDrop={onDrop}
            />
          )}
        </div>
      </div>
      <ActionFeedback result={result} successText={t.moved} />
    </div>
  );
}
