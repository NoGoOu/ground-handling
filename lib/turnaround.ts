// Pure time-calculation rules for a turnaround (CLAUDE.md, "Időszámítási szabályok").
// All Date values are UTC instants; all durations are whole minutes.

export type Anchor = "ARRIVAL" | "DEPARTURE";
export type Part = "ARRIVAL_PART" | "DEPARTURE_PART";
export type DeviationLevel = "green" | "yellow" | "red";

export const ATA_CODE = "ATA";
export const ATD_CODE = "ATD";

/** Upper limit of every template duration; the daily list relies on it. */
export const MAX_TEMPLATE_MINUTES = 1440;

export interface TemplateParams {
  minTurnaroundMinutes: number;
  travelMinutes: number;
  postDepartureMinutes: number;
  departureReportMinutes: number;
  minBreakMinutes: number;
}

export interface MilestoneDef {
  id: string;
  order: number;
  code: string;
  name: string;
  anchor: Anchor;
  offsetMinutes: number;
  required: boolean;
  part: Part;
}

export interface FlightTimes {
  /** Null on a departure-only flight (rule 11). */
  sta: Date | null;
  eta?: Date | null;
  /** Null on an arrival-only flight (rule 11). */
  std: Date | null;
  etd?: Date | null;
  /** From the external system. */
  ata?: Date | null;
  /** From the external system. */
  atd?: Date | null;
  /** "Késés és törlés": a cancelled part stays on the lists but is not worked. */
  arrivalCancelled?: boolean;
  departureCancelled?: boolean;
}

/**
 * Rule 11: a turnaround has both parts; an arrival-only flight stays here, a
 * departure-only flight is already here.
 */
export type FlightKind = "TURNAROUND" | "ARRIVAL_ONLY" | "DEPARTURE_ONLY";

export function flightKind(flight: Pick<FlightTimes, "sta" | "std">): FlightKind {
  if (flight.sta && flight.std) return "TURNAROUND";
  if (flight.sta) return "ARRIVAL_ONLY";
  if (flight.std) return "DEPARTURE_ONLY";
  throw new Error("A flight needs an arrival or a departure part");
}

export function hasPart(kind: FlightKind, part: Part): boolean {
  if (kind === "TURNAROUND") return true;
  return part === "ARRIVAL_PART" ? kind === "ARRIVAL_ONLY" : kind === "DEPARTURE_ONLY";
}

/**
 * The parts still worked after cancellations; the flight then behaves by rule 11
 * as what is left. Null when every part is cancelled.
 */
export function activeKind(flight: FlightTimes): FlightKind | null {
  const arrival = !!flight.sta && !flight.arrivalCancelled;
  const departure = !!flight.std && !flight.departureCancelled;
  if (arrival && departure) return "TURNAROUND";
  if (arrival) return "ARRIVAL_ONLY";
  if (departure) return "DEPARTURE_ONLY";
  return null;
}

export function isPartCancelled(flight: FlightTimes, part: Part): boolean {
  return part === "ARRIVAL_PART" ? !!flight.arrivalCancelled : !!flight.departureCancelled;
}

/** Rule 11: a one-sided flight has only the milestones of its own part. */
export function milestonesFor(kind: FlightKind, milestones: readonly MilestoneDef[]): MilestoneDef[] {
  return milestones.filter((m) => hasPart(kind, m.part));
}

/** Recorded actual times, keyed by milestone definition id. */
export type RecordedTimes = ReadonlyMap<string, Date>;

export interface DeviationThresholds {
  /** Deviation up to this many minutes is green. */
  greenMax: number;
  /** Deviation up to this many minutes is yellow, above it red. */
  yellowMax: number;
}

/** Rule 5 defaults, in minutes; the live values come from the global setting. */
export const DEVIATION_THRESHOLDS: DeviationThresholds = { greenMax: 0, yellowMax: 5 };

const MINUTE_MS = 60_000;

/** Rule 10: times are kept to the minute, seconds are cut off (not rounded). */
export function truncateToMinute(date: Date): Date {
  return new Date(Math.floor(date.getTime() / MINUTE_MS) * MINUTE_MS);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MINUTE_MS);
}

/** a − b in whole minutes. */
export function diffMinutes(a: Date, b: Date): number {
  return Math.round(
    (truncateToMinute(a).getTime() - truncateToMinute(b).getTime()) / MINUTE_MS,
  );
}

function later(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

export function sortByOrder<T extends { order: number }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order);
}

function recordedByCode(
  milestones: readonly MilestoneDef[],
  recorded: RecordedTimes,
  code: string,
): Date | null {
  const def = milestones.find((m) => m.code === code);
  return (def && recorded.get(def.id)) ?? null;
}

/** Rule 9: the system value wins over the agent's own record. */
export function effectiveActuals(
  flight: FlightTimes,
  milestones: readonly MilestoneDef[],
  recorded: RecordedTimes,
): { ata: Date | null; atd: Date | null } {
  return {
    ata: flight.ata ?? recordedByCode(milestones, recorded, ATA_CODE),
    atd: flight.atd ?? recordedByCode(milestones, recorded, ATD_CODE),
  };
}

/** Rule 1: effective ATA, else ETA, else STA; none on a departure-only flight (rule 11). */
export function arrivalAnchor(flight: FlightTimes, effectiveAta: Date | null): Date | null {
  if (!flight.sta) return null;
  return effectiveAta ?? flight.eta ?? flight.sta;
}

/**
 * Rule 2: the later of (ETD, else STD) and (arrival anchor + minimum
 * turnaround). Without an arrival part it is simply ETD, else STD (rule 11);
 * an arrival-only flight has none.
 */
export function departureAnchor(
  flight: FlightTimes,
  arrival: Date | null,
  params: TemplateParams,
): Date | null {
  if (!flight.std) return null;
  const scheduled = flight.etd ?? flight.std;
  return arrival ? later(scheduled, addMinutes(arrival, params.minTurnaroundMinutes)) : scheduled;
}

/**
 * Rule 3: anchor + offset, never earlier than the previous milestone's planned
 * time. On a one-sided flight a milestone may point at the anchor the flight
 * does not have; it then counts from the anchor that exists.
 */
export function plannedTimes(
  milestones: readonly MilestoneDef[],
  arrival: Date | null,
  departure: Date | null,
): Map<string, Date> {
  const planned = new Map<string, Date>();
  let previous: Date | null = null;
  for (const def of sortByOrder(milestones)) {
    const base = (def.anchor === "ARRIVAL" ? (arrival ?? departure) : (departure ?? arrival))!;
    let time = addMinutes(base, def.offsetMinutes);
    if (previous && time.getTime() < previous.getTime()) time = previous;
    planned.set(def.id, time);
    previous = time;
  }
  return planned;
}

/** Rule 5 colouring of a deviation (actual − planned). */
export function deviationLevel(
  minutes: number,
  thresholds: DeviationThresholds = DEVIATION_THRESHOLDS,
): DeviationLevel {
  if (minutes <= thresholds.greenMax) return "green";
  if (minutes <= thresholds.yellowMax) return "yellow";
  return "red";
}

export interface OrderConflict {
  /** The milestone that comes earlier in the template order… */
  earlierId: string;
  /** …but whose actual time is later than this one's. */
  laterId: string;
}

/** Rule 6: pairs where a milestone's actual time is earlier than a preceding milestone's. */
export function orderConflicts(
  milestones: readonly MilestoneDef[],
  actuals: ReadonlyMap<string, Date>,
): OrderConflict[] {
  const conflicts: OrderConflict[] = [];
  const seen: { id: string; time: Date }[] = [];
  for (const def of sortByOrder(milestones)) {
    const time = actuals.get(def.id);
    if (!time) continue;
    for (const earlier of seen) {
      if (earlier.time.getTime() > time.getTime()) {
        conflicts.push({ earlierId: earlier.id, laterId: def.id });
      }
    }
    seen.push({ id: def.id, time });
  }
  return conflicts;
}

/** Rule 7: effective ATD − STD when positive; null while there is no ATD or no departure. */
export function delayMinutes(std: Date | null, effectiveAtd: Date | null): number | null {
  if (!std || !effectiveAtd) return null;
  return Math.max(0, diffMinutes(effectiveAtd, std));
}

export interface TimelineRow {
  milestone: MilestoneDef;
  planned: Date;
  /** The agent's own record, if any. */
  recorded: Date | null;
  /** The external system's value (ATA and ATD rows only). */
  systemValue: Date | null;
  /** The value used in calculations: rule 9 for ATA/ATD, the record otherwise. */
  actual: Date | null;
  deviationMinutes: number | null;
  deviationLevel: DeviationLevel | null;
  /** Earlier milestones whose actual time is later than this row's. */
  orderConflictIds: string[];
  /** The row's part is cancelled: shown, but never flagged as missing. */
  cancelled: boolean;
}

export type TurnaroundType = "QUICK" | "LONG";

/** A half-open interval [start, end). */
export interface TimeWindow {
  start: Date;
  end: Date;
}

export interface OccupancyWindow extends TimeWindow {
  /** WHOLE for a quick turnaround, otherwise the part the window belongs to. */
  part: Part | "WHOLE";
}

export interface TurnaroundShape {
  /** Null on a one-sided flight: rule 11 gives it no turnaround type. */
  type: TurnaroundType | null;
  breakMinutes: number | null;
  arrivalWindowEnd: Date | null;
  departureWindowStart: Date | null;
  windows: OccupancyWindow[];
}

/** Planned time of the last arrival-part milestone; the arrival anchor if there is none. */
export function lastArrivalPlanned(
  milestones: readonly MilestoneDef[],
  planned: ReadonlyMap<string, Date>,
  arrival: Date,
): Date {
  const arrivalPart = sortByOrder(milestones).filter((m) => m.part === "ARRIVAL_PART");
  const last = arrivalPart.at(-1);
  return (last && planned.get(last.id)) ?? arrival;
}

/** Rule 8 and "Ügynök-foglaltság": turnaround type and occupancy windows. */
export function turnaroundShape(
  params: TemplateParams,
  arrival: Date,
  departure: Date,
  lastArrival: Date,
): TurnaroundShape {
  const arrivalWindowEnd = addMinutes(lastArrival, params.travelMinutes);
  const departureWindowStart = addMinutes(
    departure,
    -params.departureReportMinutes - params.travelMinutes,
  );
  const breakMinutes = diffMinutes(departureWindowStart, arrivalWindowEnd);
  const start = addMinutes(arrival, -params.travelMinutes);
  const end = addMinutes(departure, params.postDepartureMinutes);

  if (breakMinutes >= params.minBreakMinutes) {
    return {
      type: "LONG",
      breakMinutes,
      arrivalWindowEnd,
      departureWindowStart,
      windows: [
        { part: "ARRIVAL_PART", start, end: arrivalWindowEnd },
        { part: "DEPARTURE_PART", start: departureWindowStart, end },
      ],
    };
  }
  return {
    type: "QUICK",
    breakMinutes,
    arrivalWindowEnd,
    departureWindowStart,
    windows: [{ part: "WHOLE", start, end }],
  };
}

/**
 * "Ügynök-foglaltság", one-sided flight: one window, by the formula of the
 * matching part of a long turnaround.
 */
export function oneSidedShape(
  params: TemplateParams,
  kind: Exclude<FlightKind, "TURNAROUND">,
  anchor: Date,
  lastArrival: Date,
): TurnaroundShape {
  if (kind === "ARRIVAL_ONLY") {
    const arrivalWindowEnd = addMinutes(lastArrival, params.travelMinutes);
    return {
      type: null,
      breakMinutes: null,
      arrivalWindowEnd,
      departureWindowStart: null,
      windows: [{ part: "ARRIVAL_PART", start: addMinutes(anchor, -params.travelMinutes), end: arrivalWindowEnd }],
    };
  }
  const departureWindowStart = addMinutes(anchor, -params.departureReportMinutes - params.travelMinutes);
  return {
    type: null,
    breakMinutes: null,
    arrivalWindowEnd: null,
    departureWindowStart,
    windows: [
      { part: "DEPARTURE_PART", start: departureWindowStart, end: addMinutes(anchor, params.postDepartureMinutes) },
    ],
  };
}

/** A flight with every part cancelled occupies nobody. */
const NO_SHAPE: TurnaroundShape = {
  type: null,
  breakMinutes: null,
  arrivalWindowEnd: null,
  departureWindowStart: null,
  windows: [],
};

export function windowsOverlap(a: TimeWindow, b: TimeWindow): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();
}

/** Rule 8: on a quick turnaround the arrival agent also does the departure part. */
export function effectiveDepartureAgentId(
  type: TurnaroundType | null,
  arrivalAgentId: string | null,
  departureAgentId: string | null,
): string | null {
  return type === "QUICK" ? arrivalAgentId : departureAgentId;
}

export interface Timeline {
  /** The parts the flight has. */
  kind: FlightKind;
  /** The parts still worked after cancellations; null when all are cancelled. */
  activeKind: FlightKind | null;
  /** Null on a departure-only flight. */
  arrivalAnchor: Date | null;
  /** Null on an arrival-only flight. */
  departureAnchor: Date | null;
  effectiveAta: Date | null;
  effectiveAtd: Date | null;
  delayMinutes: number | null;
  shape: TurnaroundShape;
  rows: TimelineRow[];
}

export interface TimelineInput {
  flight: FlightTimes;
  params: TemplateParams;
  milestones: readonly MilestoneDef[];
  recorded: RecordedTimes;
  /** Global setting (decision 7); the defaults are used when not given. */
  thresholds?: DeviationThresholds;
}

export function computeTimeline({
  flight,
  params,
  milestones,
  recorded,
  thresholds = DEVIATION_THRESHOLDS,
}: TimelineInput): Timeline {
  const kind = flightKind(flight);
  const active = activeKind(flight);
  // Rule 11: the milestones of a missing part do not exist for this flight.
  milestones = milestonesFor(kind, milestones);
  const { ata, atd } = effectiveActuals(flight, milestones, recorded);
  const arrival = arrivalAnchor(flight, ata);
  // A cancelled arrival leaves a departure-only flight: no minimum turnaround.
  const departure = departureAnchor(flight, flight.arrivalCancelled ? null : arrival, params);
  const planned = plannedTimes(milestones, arrival, departure);

  const actuals = new Map<string, Date>();
  const systemValues = new Map<string, Date | null>();
  for (const def of milestones) {
    const system =
      def.code === ATA_CODE ? (flight.ata ?? null) : def.code === ATD_CODE ? (flight.atd ?? null) : null;
    systemValues.set(def.id, system);
    const actual = system ?? recorded.get(def.id) ?? null;
    if (actual) actuals.set(def.id, actual);
  }

  const conflicts = orderConflicts(milestones, actuals);

  const rows = sortByOrder(milestones).map((def): TimelineRow => {
    const plannedTime = planned.get(def.id)!;
    const actual = actuals.get(def.id) ?? null;
    const deviation = actual ? diffMinutes(actual, plannedTime) : null;
    return {
      milestone: def,
      planned: plannedTime,
      recorded: recorded.get(def.id) ?? null,
      systemValue: systemValues.get(def.id) ?? null,
      actual,
      deviationMinutes: deviation,
      deviationLevel: deviation === null ? null : deviationLevel(deviation, thresholds),
      orderConflictIds: conflicts.filter((c) => c.laterId === def.id).map((c) => c.earlierId),
      cancelled: isPartCancelled(flight, def.part),
    };
  });

  // Occupancy and turnaround type come from the parts still worked.
  const lastArrival = lastArrivalPlanned(milestones, planned, (arrival ?? departure)!);
  const shape =
    active === null
      ? NO_SHAPE
      : active === "TURNAROUND"
        ? turnaroundShape(params, arrival!, departure!, lastArrival)
        : oneSidedShape(params, active, (active === "ARRIVAL_ONLY" ? arrival : departure)!, lastArrival);

  return {
    kind,
    activeKind: active,
    arrivalAnchor: arrival,
    departureAnchor: departure,
    effectiveAta: ata,
    effectiveAtd: atd,
    delayMinutes: flight.departureCancelled ? null : delayMinutes(flight.std, atd),
    shape,
    rows,
  };
}

/**
 * A required milestone without an actual time is flagged as missing once its
 * planned time has passed or the task is completed (decision 5 in CLAUDE.md).
 */
export function isRequiredMissing(
  row: Pick<TimelineRow, "milestone" | "actual" | "planned"> & { cancelled?: boolean },
  { now, completed }: { now: Date; completed: boolean },
): boolean {
  // A cancelled part's milestones are never flagged ("Késés és törlés").
  if (!row.milestone.required || row.actual || row.cancelled) return false;
  return completed || now.getTime() >= row.planned.getTime();
}
