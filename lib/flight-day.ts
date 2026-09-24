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
