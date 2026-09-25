import { addMinutes, MAX_TEMPLATE_MINUTES, type Timeline, type TimeWindow } from "@/lib/turnaround";

// Which Budapest day a turnaround shows on (CLAUDE.md, "További eldöntött
// szabályok" 1, modified 2026-09-24). Pure functions: the caller passes the UTC
// bounds of the day. The same rule serves the daily list, the agent view and the
// band view.

export interface DayAnchors {
  /** Rule 1: effective ATA, else ETA, else STA. None on a departure-only flight. */
  arrival: Date | null;
  /** The effective ATD, else the departure anchor (rule 2). None on an arrival-only flight. */
  departure: Date | null;
  /** The list order: the arrival anchor, or the departure anchor when there is no arrival. */
  order: Date;
}

export function dayAnchors(timeline: Pick<Timeline, "arrivalAnchor" | "departureAnchor" | "effectiveAtd">): DayAnchors {
  return {
    arrival: timeline.arrivalAnchor,
    departure: timeline.effectiveAtd ?? timeline.departureAnchor,
    order: (timeline.arrivalAnchor ?? timeline.departureAnchor)!,
  };
}

/** Half-open, like every window in the app: midnight belongs to the next day. */
function within(instant: Date | null, day: TimeWindow): boolean {
  return !!instant && day.start.getTime() <= instant.getTime() && instant.getTime() < day.end.getTime();
}

/**
 * A turnaround shows on the day its arrival anchor or its effective departure
 * falls on, so one that runs over midnight shows on both days, and one that is
 * days late shows on its actual day only. A one-sided flight has only one of
 * the two times (rule 11).
 */
export function showsOnDay(anchors: DayAnchors, day: TimeWindow): boolean {
  return within(anchors.arrival, day) || within(anchors.departure, day);
}

/** The items that show on the day, in list order (arrival anchor, else departure anchor). */
export function forDay<T>(items: readonly T[], anchorsOf: (item: T) => DayAnchors, day: TimeWindow): T[] {
  return items
    .map((item) => ({ item, anchors: anchorsOf(item) }))
    .filter(({ anchors }) => showsOnDay(anchors, day))
    .sort((a, b) => a.anchors.order.getTime() - b.anchors.order.getTime())
    .map(({ item }) => item);
}

/**
 * The database only sees stored times, so it fetches every turnaround with a
 * stored time (STA, ETA, ATA, STD, ETD, ATD or an ATA/ATD record) in this wider
 * window, and showsOnDay decides. The departure anchor may be the arrival
 * anchor + minimum turnaround, which is at most MAX_TEMPLATE_MINUTES, hence the
 * extra stretch before the day.
 */
export function candidateWindow(day: TimeWindow): TimeWindow {
  return { start: addMinutes(day.start, -MAX_TEMPLATE_MINUTES), end: day.end };
}

/** What the flight-level day filter needs of a task (5. mérföldkő). */
export interface FlightTaskKey {
  flightId: string;
  isPrimary: boolean;
  /** Orders the tasks of one flight after the primary one, e.g. the task type code. */
  sortKey: string;
}

/**
 * Several tasks per flight (5. mérföldkő): the day and the order are the
 * flight's, taken from its primary task, and all the tasks of a flight show
 * together, the primary one first. A flight without a primary task leads with
 * its first task by sort key.
 */
export function tasksForDay<T>(
  tasks: readonly T[],
  keyOf: (task: T) => FlightTaskKey,
  anchorsOf: (task: T) => DayAnchors,
  day: TimeWindow,
): T[] {
  const byFlight = new Map<string, T[]>();
  for (const task of tasks) {
    const list = byFlight.get(keyOf(task).flightId) ?? [];
    list.push(task);
    byFlight.set(keyOf(task).flightId, list);
  }
  const ordered = [...byFlight.values()].map((list) =>
    [...list].sort((a, b) => {
      const [ka, kb] = [keyOf(a), keyOf(b)];
      if (ka.isPrimary !== kb.isPrimary) return ka.isPrimary ? -1 : 1;
      return ka.sortKey < kb.sortKey ? -1 : ka.sortKey > kb.sortKey ? 1 : 0;
    }),
  );
  return forDay(ordered, (list) => anchorsOf(list[0]), day).flat();
}
