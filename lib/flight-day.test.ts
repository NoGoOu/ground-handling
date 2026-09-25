import { describe, expect, it } from "vitest";
import { DEMO_MILESTONES, DEMO_TEMPLATE_PARAMS } from "@/lib/demo-template";
import { candidateWindow, dayAnchors, forDay, showsOnDay, tasksForDay, type DayAnchors } from "@/lib/flight-day";
import { localDayRange, parseLocalDateTime } from "@/lib/time";
import { computeTimeline, MAX_TEMPLATE_MINUTES, type FlightTimes, type MilestoneDef } from "@/lib/turnaround";

const milestones: MilestoneDef[] = DEMO_MILESTONES.map((m) => ({ ...m, id: m.code }));

/** Budapest local time → UTC instant. */
const at = (local: string) => parseLocalDateTime(local)!;
const day = (localDate: string) => localDayRange(localDate);

function anchorsOf(flight: FlightTimes, params = DEMO_TEMPLATE_PARAMS): DayAnchors {
  return dayAnchors(computeTimeline({ flight, params, milestones, recorded: new Map() }));
}

describe("which day a turnaround shows on", () => {
  it("shows an on-time turnaround on its own day only", () => {
    const anchors = anchorsOf({ sta: at("2026-09-24T10:00"), std: at("2026-09-24T11:00") });
    expect(showsOnDay(anchors, day("2026-09-24"))).toBe(true);
    expect(showsOnDay(anchors, day("2026-09-23"))).toBe(false);
    expect(showsOnDay(anchors, day("2026-09-25"))).toBe(false);
  });

  it("shows a turnaround that runs over midnight on both days", () => {
    const anchors = anchorsOf({ sta: at("2026-09-24T23:30"), std: at("2026-09-25T00:30") });
    expect(showsOnDay(anchors, day("2026-09-24"))).toBe(true);
    expect(showsOnDay(anchors, day("2026-09-25"))).toBe(true);
  });

  it("moves a flight five days late to its actual day and off the original one", () => {
    const flight = {
      sta: at("2026-09-20T10:00"),
      std: at("2026-09-20T10:40"),
      eta: at("2026-09-25T10:00"),
      etd: at("2026-09-25T10:40"),
    };
    const anchors = anchorsOf(flight);
    expect(showsOnDay(anchors, day("2026-09-20"))).toBe(false);
    for (const between of ["2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24"]) {
      expect(showsOnDay(anchors, day(between)), between).toBe(false);
    }
    expect(showsOnDay(anchors, day("2026-09-25"))).toBe(true);
    // The database still fetches it for the actual day: the ETA is inside the window.
    const window = candidateWindow(day("2026-09-25"));
    expect(flight.eta.getTime()).toBeGreaterThanOrEqual(window.start.getTime());
    expect(flight.eta.getTime()).toBeLessThan(window.end.getTime());
  });

  it("follows the effective ATA past midnight, and the departure anchor with it", () => {
    // Late evening arrival that lands after midnight: rule 2 pushes the departure too.
    const anchors = anchorsOf({
      sta: at("2026-09-24T23:00"),
      std: at("2026-09-24T23:50"),
      ata: at("2026-09-25T00:20"),
    });
    expect(showsOnDay(anchors, day("2026-09-24"))).toBe(false);
    expect(showsOnDay(anchors, day("2026-09-25"))).toBe(true);
  });

  it("takes the effective ATD as the departure when there is one", () => {
    const anchors = anchorsOf({
      sta: at("2026-09-24T22:00"),
      std: at("2026-09-24T22:40"),
      atd: at("2026-09-25T00:10"),
    });
    expect(anchors.departure).toEqual(at("2026-09-25T00:10"));
    expect(showsOnDay(anchors, day("2026-09-24"))).toBe(true);
    expect(showsOnDay(anchors, day("2026-09-25"))).toBe(true);
  });

  it("shows an arrival-only flight on its arrival day only", () => {
    const anchors = anchorsOf({ sta: at("2026-09-24T23:30"), std: null });
    expect(anchors.departure).toBeNull();
    expect(showsOnDay(anchors, day("2026-09-24"))).toBe(true);
    expect(showsOnDay(anchors, day("2026-09-25"))).toBe(false);
  });

  it("shows a departure-only flight on its effective departure day", () => {
    const anchors = anchorsOf({ sta: null, std: at("2026-09-24T23:50"), etd: at("2026-09-25T01:10") });
    expect(anchors.arrival).toBeNull();
    expect(showsOnDay(anchors, day("2026-09-24"))).toBe(false);
    expect(showsOnDay(anchors, day("2026-09-25"))).toBe(true);
  });

  it("puts midnight on the next day (half-open days)", () => {
    const midnight = day("2026-09-25").start;
    const anchors = { arrival: midnight, departure: midnight, order: midnight };
    expect(showsOnDay(anchors, day("2026-09-24"))).toBe(false);
    expect(showsOnDay(anchors, day("2026-09-25"))).toBe(true);
  });
});

describe("the list of a day", () => {
  const turnaround = (id: string, arrival: string, departure: string) => ({
    id,
    anchors: { arrival: at(arrival), departure: at(departure), order: at(arrival) },
  });

  it("keeps what shows on the day, ordered by the arrival anchor", () => {
    const items = [
      turnaround("late", "2026-09-24T18:00", "2026-09-24T18:40"),
      turnaround("other-day", "2026-09-23T09:00", "2026-09-23T09:40"),
      turnaround("early", "2026-09-24T06:00", "2026-09-24T06:40"),
      // Arrived yesterday, leaves today: it shows today, sorted by its arrival.
      turnaround("overnight", "2026-09-23T23:00", "2026-09-24T07:00"),
    ];
    const ids = forDay(items, (item) => item.anchors, day("2026-09-24")).map((item) => item.id);
    expect(ids).toEqual(["overnight", "early", "late"]);
  });

  it("orders a departure-only flight by its departure anchor among the arrivals", () => {
    const departureOnly = {
      id: "departure-only",
      anchors: anchorsOf({ sta: null, std: at("2026-09-24T09:00") }),
    };
    const items = [
      turnaround("early", "2026-09-24T06:00", "2026-09-24T06:40"),
      turnaround("late", "2026-09-24T18:00", "2026-09-24T18:40"),
      departureOnly,
    ];
    const ids = forDay(items, (item) => item.anchors, day("2026-09-24")).map((item) => item.id);
    expect(ids).toEqual(["early", "departure-only", "late"]);
  });
});

describe("the database window", () => {
  it("reaches back by the longest possible minimum turnaround", () => {
    const today = day("2026-09-24");
    const window = candidateWindow(today);
    expect(today.start.getTime() - window.start.getTime()).toBe(MAX_TEMPLATE_MINUTES * 60_000);
    expect(window.end).toEqual(today.end);
  });

  it("catches a turnaround that only reaches the day through the minimum turnaround", () => {
    const params = { ...DEMO_TEMPLATE_PARAMS, minTurnaroundMinutes: MAX_TEMPLATE_MINUTES };
    const flight = { sta: at("2026-09-23T00:30"), std: at("2026-09-23T01:30") };
    const anchors = anchorsOf(flight, params);
    const today = day("2026-09-24");
    expect(showsOnDay(anchors, today)).toBe(true);
    expect(flight.sta.getTime()).toBeGreaterThanOrEqual(candidateWindow(today).start.getTime());
  });
});

describe("the day of a flight with several tasks (5. mérföldkő)", () => {
  const day = { start: new Date("2026-09-24T22:00:00Z"), end: new Date("2026-09-25T22:00:00Z") };
  const anchors = (arrival: string, departure: string) => ({
    arrival: new Date(arrival),
    departure: new Date(departure),
    order: new Date(arrival),
  });
  const task = (flightId: string, code: string, isPrimary: boolean, arrival: string, departure: string) => ({
    id: `${flightId}-${code}`,
    key: { flightId, isPrimary, sortKey: code },
    anchors: anchors(arrival, departure),
  });
  const ids = (list: { id: string }[]) => list.map((t) => t.id);

  it("follows the primary task and keeps a flight's tasks together, the primary one first", () => {
    const tasks = [
      task("b", "HDS", false, "2026-09-25T06:00:00Z", "2026-09-25T07:00:00Z"),
      task("a", "ALAP", true, "2026-09-25T08:00:00Z", "2026-09-25T09:00:00Z"),
      task("b", "GOU", true, "2026-09-25T06:00:00Z", "2026-09-25T06:30:00Z"),
      task("a", "BAG", false, "2026-09-25T08:00:00Z", "2026-09-25T09:10:00Z"),
    ];
    expect(ids(tasksForDay(tasks, (t) => t.key, (t) => t.anchors, day))).toEqual(["b-GOU", "b-HDS", "a-ALAP", "a-BAG"]);
  });

  it("shows no task of a flight whose primary task is on another day", () => {
    // The other task's departure alone would fall on the day: the flight does not.
    const tasks = [
      task("c", "GOU", true, "2026-09-24T18:00:00Z", "2026-09-24T19:00:00Z"),
      task("c", "HDS", false, "2026-09-24T18:00:00Z", "2026-09-24T22:30:00Z"),
    ];
    expect(tasksForDay(tasks, (t) => t.key, (t) => t.anchors, day)).toEqual([]);
  });
});
