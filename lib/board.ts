import type { TaskStatus } from "@/generated/prisma/enums";
import { windowsOverlap, type OccupancyWindow, type Part, type TimeWindow, type TurnaroundType } from "@/lib/turnaround";

// Model of the band view (CLAUDE.md, "Sávos idősoros nézet"). Pure functions:
// the data layer passes in tasks and shifts, and gets lanes and boxes back.

/**
 * The three conflicts of the band view (CLAUDE.md, "Kiosztás és ütközés"): two
 * occupancy windows of the same agent overlap, an occupancy window runs into a
 * non-operative block, or it is not inside the agent's operative segments.
 */
export type ConflictKind = "OVERLAP" | "BLOCK" | "OUTSIDE_SHIFT";

/** What the view needs from a task; the data layer maps a TaskView onto this. */
export interface BoardTask {
  id: string;
  flightLabel: string;
  stand: string;
  status: TaskStatus;
  /** Null on a one-sided flight: its single box is the part it has. */
  type: TurnaroundType | null;
  arrivalAgentId: string | null;
  /** As assigned; on a quick turnaround the arrival agent covers both parts. */
  departureAgentId: string | null;
  windows: OccupancyWindow[];
}

/** One segment of the actual roster, operative or not. */
export interface BoardSegment extends TimeWindow {
  id: string;
  userId: string;
  typeName: string;
  operative: boolean;
  createBlock: boolean;
  travelBeforeMinutes: number;
  travelAfterMinutes: number;
  location: string | null;
  description: string | null;
}

/** A non-operative segment shown on the lane, travel time included. */
export interface BoardBlock extends TimeWindow {
  id: string;
  label: string;
  location: string | null;
  description: string | null;
  /** The segment itself, without the travel time. */
  segment: TimeWindow;
}

const MINUTE_MS = 60_000;

/** Block: segment start − travel there → segment end + travel back. */
export function blockOf(segment: BoardSegment): BoardBlock {
  return {
    id: segment.id,
    label: segment.typeName,
    location: segment.location,
    description: segment.description,
    start: new Date(segment.start.getTime() - segment.travelBeforeMinutes * MINUTE_MS),
    end: new Date(segment.end.getTime() + segment.travelAfterMinutes * MINUTE_MS),
    segment: { start: segment.start, end: segment.end },
  };
}

/** The blocks of one agent's day, in time order. */
export function blocksOf(segments: readonly BoardSegment[]): BoardBlock[] {
  return segments
    .filter((segment) => !segment.operative && segment.createBlock)
    .map(blockOf)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

export interface BoardBox extends TimeWindow {
  /** Stable id for drag and drop: task and part. */
  id: string;
  taskId: string;
  part: Part | "WHOLE";
  flightLabel: string;
  stand: string;
  status: TaskStatus;
  agentId: string | null;
  conflicts: ConflictKind[];
}

export interface BoardLane {
  agent: { id: string; name: string };
  /** Operative stretches: the time the agent may work flights. */
  shifts: TimeWindow[];
  blocks: BoardBlock[];
  /** False when the agent has tasks that day but no shift (marked in the view). */
  hasShift: boolean;
  boxes: BoardBox[];
}

export interface Board {
  lanes: BoardLane[];
  unassigned: BoardBox[];
}

/** One box on a quick turnaround, two on a long one. */
export function taskBoxes(task: BoardTask): BoardBox[] {
  return task.windows.map((window) => ({
    id: `${task.id}:${window.part}`,
    taskId: task.id,
    part: window.part,
    start: window.start,
    end: window.end,
    flightLabel: task.flightLabel,
    stand: task.stand,
    status: task.status,
    agentId: window.part === "DEPARTURE_PART" ? task.departureAgentId : task.arrivalAgentId,
    conflicts: [],
  }));
}

/** Merges touching or overlapping windows into continuous stretches. */
export function mergeWindows(windows: readonly TimeWindow[]): TimeWindow[] {
  const sorted = [...windows].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: TimeWindow[] = [];
  for (const window of sorted) {
    const last = merged.at(-1);
    if (last && window.start.getTime() <= last.end.getTime()) {
      if (window.end.getTime() > last.end.getTime()) last.end = window.end;
    } else {
      merged.push({ start: window.start, end: window.end });
    }
  }
  return merged;
}

function isCovered(box: TimeWindow, stretches: readonly TimeWindow[]): boolean {
  return stretches.some(
    (s) => s.start.getTime() <= box.start.getTime() && box.end.getTime() <= s.end.getTime(),
  );
}

/**
 * Conflicts of one agent: two occupancy windows overlapping, a window running
 * into a block, and a window outside the operative segments.
 */
export function conflictsFor(
  boxes: readonly BoardBox[],
  shifts: readonly TimeWindow[],
  blocks: readonly TimeWindow[] = [],
): Map<string, ConflictKind[]> {
  const stretches = mergeWindows(shifts);
  const result = new Map<string, ConflictKind[]>();
  const add = (id: string, kind: ConflictKind) => {
    const kinds = result.get(id) ?? [];
    if (!kinds.includes(kind)) result.set(id, [...kinds, kind]);
  };

  for (const box of boxes) {
    if (!isCovered(box, stretches)) add(box.id, "OUTSIDE_SHIFT");
    for (const other of boxes) {
      if (other.id !== box.id && windowsOverlap(box, other)) add(box.id, "OVERLAP");
    }
    if (blocks.some((block) => windowsOverlap(box, block))) add(box.id, "BLOCK");
  }
  return result;
}

export interface Assignment {
  arrivalAgentId: string | null;
  departureAgentId: string | null;
}

/**
 * Dropping a box on a lane: the arrival box sets the arrival agent, the
 * departure box the departure agent. A quick turnaround has one box and both
 * parts go to the arrival agent (rule 8). A null agent clears the assignment.
 */
export function assignmentUpdate(
  part: Part | "WHOLE",
  type: TurnaroundType | null,
  agentId: string | null,
  current: Assignment,
): Assignment {
  if (part === "DEPARTURE_PART") return { ...current, departureAgentId: agentId };
  if (type === "QUICK") return { arrivalAgentId: agentId, departureAgentId: agentId };
  return { ...current, arrivalAgentId: agentId };
}

const HOUR_MS = 3_600_000;

/**
 * Time range of the view: the day, widened to whole hours so that boxes and
 * shifts reaching outside the day (night shifts, long turnarounds) still fit.
 */
export function boardRange(day: TimeWindow, windows: readonly TimeWindow[]): TimeWindow {
  const startMs = Math.min(day.start.getTime(), ...windows.map((w) => w.start.getTime()));
  const endMs = Math.max(day.end.getTime(), ...windows.map((w) => w.end.getTime()));
  return {
    start: new Date(Math.floor(startMs / HOUR_MS) * HOUR_MS),
    end: new Date(Math.ceil(endMs / HOUR_MS) * HOUR_MS),
  };
}

/** Whole hours of the range, for the axis labels. */
export function hourTicks(range: TimeWindow): Date[] {
  const ticks: Date[] = [];
  for (let ms = range.start.getTime(); ms <= range.end.getTime(); ms += HOUR_MS) ticks.push(new Date(ms));
  return ticks;
}

/** Lanes for agents with a shift that day, plus agents that only have tasks. */
export function buildBoard({
  tasks,
  segments,
  agents,
}: {
  tasks: readonly BoardTask[];
  segments: readonly BoardSegment[];
  agents: readonly { id: string; name: string }[];
}): Board {
  const boxes = tasks.flatMap(taskBoxes);
  const byId = new Map(agents.map((agent) => [agent.id, agent]));
  const laneIds = new Set<string>();
  for (const segment of segments) laneIds.add(segment.userId);
  for (const box of boxes) if (box.agentId) laneIds.add(box.agentId);

  const lanes = [...laneIds]
    .map((id) => {
      const agentSegments = segments.filter((segment) => segment.userId === id);
      const agentShifts = agentSegments
        .filter((segment) => segment.operative)
        .map(({ start, end }) => ({ start, end }));
      const agentBlocks = blocksOf(agentSegments);
      const laneBoxes = boxes.filter((box) => box.agentId === id);
      const conflicts = conflictsFor(laneBoxes, agentShifts, agentBlocks);
      return {
        agent: byId.get(id) ?? { id, name: id },
        shifts: agentShifts,
        blocks: agentBlocks,
        hasShift: agentShifts.length > 0,
        boxes: laneBoxes
          .map((box) => ({ ...box, conflicts: conflicts.get(box.id) ?? [] }))
          .sort((a, b) => a.start.getTime() - b.start.getTime()),
      };
    })
    .sort((a, b) => a.agent.name.localeCompare(b.agent.name, "hu"));

  return {
    lanes,
    unassigned: boxes.filter((box) => !box.agentId).sort((a, b) => a.start.getTime() - b.start.getTime()),
  };
}
