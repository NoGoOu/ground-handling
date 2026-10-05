import type { Prisma } from "@/generated/prisma/client";
import type { EstimateSource, TaskStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { readMetrics, type OjtMetrics } from "@/lib/exams/ojt";
import { lateness, type Lateness } from "@/lib/flight";
import { candidateWindow, dayAnchors, tasksForDay } from "@/lib/flight-day";
import { parseTemplateSnapshot } from "@/lib/snapshot";
import { getSettings } from "@/lib/settings";
import { localDayRange } from "@/lib/time";
import {
  ATA_CODE,
  ATD_CODE,
  BOTH_PARTS,
  computeTimeline,
  effectiveDepartureAgentId,
  type DeviationThresholds,
  type MilestoneDef,
  type Part,
  type TemplateParams,
  type TemplateParts,
  type Timeline,
} from "@/lib/turnaround";

const personSelect = { select: { id: true, name: true } } as const;

/** The primary task's ATA/ATD records: the flight's actuals when the system has none (5. mérföldkő). */
const primaryActualsInclude = {
  where: { isPrimary: true },
  select: {
    records: {
      where: { milestoneDefinition: { code: { in: [ATA_CODE, ATD_CODE] } } },
      select: { actualTime: true, milestoneDefinition: { select: { code: true } } },
    },
  },
} satisfies Prisma.Flight$tasksArgs;

const taskInclude = {
  template: { include: { milestones: true } },
  taskType: { select: { id: true, name: true, code: true } },
  flight: {
    include: {
      airline: true,
      tasks: primaryActualsInclude,
      etaRecordedBy: personSelect,
      etdRecordedBy: personSelect,
      arrivalCancelledBy: personSelect,
      departureCancelledBy: personSelect,
    },
  },
  arrivalAgent: personSelect,
  departureAgent: personSelect,
  records: { include: { recordedBy: personSelect, updatedBy: personSelect } },
  // Trainees next to the agents (10. mérföldkő).
  ojtSessions: {
    include: {
      trainee: personSelect,
      mentor: personSelect,
      addedBy: personSelect,
      process: {
        select: {
          id: true,
          status: true,
          training: {
            select: {
              id: true,
              name: true,
              ojtRequiredCount: true,
              ojtMinCompletenessPercent: true,
              ojtMinOnTimePercent: true,
              qualification: { select: { id: true, active: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.TaskInclude;

type TaskWithRelations = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

export interface PersonRef {
  id: string;
  name: string;
}

export interface RecordInfo {
  actualTime: Date;
  recordedBy: PersonRef;
  recordedAt: Date;
  updatedBy: PersonRef | null;
  updatedAt: Date | null;
  /** Recorded, or last corrected, by the trainee of the part (10. mérföldkő). */
  byTrainee: boolean;
  updatedByTrainee: boolean;
}

/** A trainee next to the agent of a part, with the mentor's evaluation (10. mérföldkő). */
export interface OjtSessionView {
  id: string;
  part: Part;
  trainee: PersonRef;
  process: {
    id: string;
    status: "IN_PROGRESS" | "RELEASED" | "ABORTED";
    training: {
      id: string;
      name: string;
      ojtRequiredCount: number;
      ojtMinCompletenessPercent: number;
      ojtMinOnTimePercent: number;
      qualification: { id: string; active: boolean } | null;
    };
  };
  addedBy: PersonRef;
  addedAt: Date;
  verdict: "PASS" | "FAIL" | null;
  comment: string | null;
  /** Frozen at the evaluation. */
  metrics: OjtMetrics | null;
  mentor: PersonRef | null;
  evaluatedAt: Date | null;
}

/** Where the current ETA or ETD came from ("Késés és törlés"). */
export interface EstimateInfo {
  source: EstimateSource | null;
  note: string | null;
  by: PersonRef | null;
  at: Date | null;
}

export interface Cancellation {
  by: PersonRef | null;
  at: Date | null;
}

export interface TaskView {
  id: string;
  status: TaskStatus;
  /** The kind of work (5. mérföldkő). */
  taskType: { id: string; name: string; code: string };
  /** Its ATA/ATD records are the flight's when the external system has none. */
  isPrimary: boolean;
  /** The parts of the task's template. */
  templateParts: TemplateParts;
  flight: {
    id: string;
    /** With the task type, it gives the qualifications the task needs (6. mérföldkő). */
    airlineId: string;
    /** The arrival part; null on a departure-only flight (rule 11). */
    inboundFlightNumber: string | null;
    /** The departure part; null on an arrival-only flight (rule 11). */
    outboundFlightNumber: string | null;
    /** Null until the shift lead sets it. */
    stand: string | null;
    sta: Date | null;
    eta: Date | null;
    std: Date | null;
    etd: Date | null;
    ata: Date | null;
    atd: Date | null;
    airline: { name: string; iataCode: string };
    templateName: string;
    etaInfo: EstimateInfo | null;
    etdInfo: EstimateInfo | null;
    /** Null while the part is worked. */
    arrivalCancellation: Cancellation | null;
    departureCancellation: Cancellation | null;
    arrivalCancelled: boolean;
    departureCancelled: boolean;
    /** "Az utolsó importból hiányzik", per part. */
    arrivalMissing: boolean;
    departureMissing: boolean;
  };
  /** "Késik": the effective arrival or departure is later than scheduled. */
  late: Lateness;
  arrivalAgent: PersonRef | null;
  /** As assigned; on a quick turnaround the arrival agent does this part instead. */
  departureAgent: PersonRef | null;
  effectiveDepartureAgent: PersonRef | null;
  params: TemplateParams;
  milestones: MilestoneDef[];
  /** True when a completed task is calculated from its template snapshot. */
  frozen: boolean;
  /** Agent records keyed by milestone definition id. */
  records: Map<string, RecordInfo>;
  timeline: Timeline;
  /** At most one per part, as stored; on a quick turnaround the arrival one covers both. */
  ojt: OjtSessionView[];
}

function templateFor(task: TaskWithRelations): {
  params: TemplateParams;
  milestones: MilestoneDef[];
  parts: TemplateParts;
  frozen: boolean;
} {
  const snapshot = task.status === "COMPLETED" ? parseTemplateSnapshot(task.templateSnapshot) : null;
  if (snapshot) return { params: snapshot.params, milestones: snapshot.milestones, parts: snapshot.parts ?? BOTH_PARTS, frozen: true };
  const { template } = task;
  return {
    params: template,
    milestones: template.milestones,
    parts: { arrival: template.arrivalPart, departure: template.departurePart },
    frozen: false,
  };
}

/** For a task that is not primary, the primary task's ATA/ATD records (5. mérföldkő). */
function primaryRecordsFor(task: TaskWithRelations): { ata: Date | null; atd: Date | null } | undefined {
  const primary = task.flight.tasks[0];
  if (task.isPrimary || !primary) return undefined;
  const byCode = (code: string) => primary.records.find((r) => r.milestoneDefinition.code === code)?.actualTime ?? null;
  return { ata: byCode(ATA_CODE), atd: byCode(ATD_CODE) };
}

function toTaskView(task: TaskWithRelations, thresholds: DeviationThresholds): TaskView {
  const { flight } = task;
  const { params, milestones, parts, frozen } = templateFor(task);
  const records = new Map<string, RecordInfo>(
    task.records.map((r) => [
      r.milestoneDefinitionId,
      {
        actualTime: r.actualTime,
        recordedBy: r.recordedBy,
        recordedAt: r.recordedAt,
        updatedBy: r.updatedBy,
        updatedAt: r.updatedAt,
        byTrainee: r.byTrainee,
        updatedByTrainee: r.updatedByTrainee,
      },
    ]),
  );
  const timeline = computeTimeline({
    flight,
    params,
    milestones,
    recorded: new Map([...records].map(([id, r]) => [id, r.actualTime])),
    thresholds,
    templateParts: parts,
    primaryRecords: primaryRecordsFor(task),
  });
  const departureAgentId = effectiveDepartureAgentId(
    timeline.shape.type,
    task.arrivalAgentId,
    task.departureAgentId,
  );

  return {
    id: task.id,
    status: task.status,
    taskType: task.taskType,
    isPrimary: task.isPrimary,
    templateParts: parts,
    flight: {
      id: flight.id,
      airlineId: flight.airlineId,
      inboundFlightNumber: flight.inboundFlightNumber,
      outboundFlightNumber: flight.outboundFlightNumber,
      stand: flight.stand,
      sta: flight.sta,
      eta: flight.eta,
      std: flight.std,
      etd: flight.etd,
      ata: flight.ata,
      atd: flight.atd,
      airline: { name: flight.airline.name, iataCode: flight.airline.iataCode },
      templateName: task.template.name,
      etaInfo: flight.eta
        ? { source: flight.etaSource, note: flight.etaNote, by: flight.etaRecordedBy, at: flight.etaRecordedAt }
        : null,
      etdInfo: flight.etd
        ? { source: flight.etdSource, note: flight.etdNote, by: flight.etdRecordedBy, at: flight.etdRecordedAt }
        : null,
      arrivalCancellation: flight.arrivalCancelled
        ? { by: flight.arrivalCancelledBy, at: flight.arrivalCancelledAt }
        : null,
      departureCancellation: flight.departureCancelled
        ? { by: flight.departureCancelledBy, at: flight.departureCancelledAt }
        : null,
      arrivalCancelled: flight.arrivalCancelled,
      departureCancelled: flight.departureCancelled,
      arrivalMissing: flight.arrivalMissing,
      departureMissing: flight.departureMissing,
    },
    late: lateness(flight, timeline, thresholds.yellowMax),
    arrivalAgent: task.arrivalAgent,
    departureAgent: task.departureAgent,
    effectiveDepartureAgent:
      departureAgentId === task.arrivalAgentId ? task.arrivalAgent : task.departureAgent,
    params,
    milestones,
    frozen,
    records,
    timeline,
    ojt: task.ojtSessions.map((session) => ({
      id: session.id,
      part: session.part,
      trainee: session.trainee,
      process: session.process,
      addedBy: session.addedBy,
      addedAt: session.addedAt,
      verdict: session.verdict,
      comment: session.comment,
      metrics: readMetrics(session.metrics),
      mentor: session.mentor,
      evaluatedAt: session.evaluatedAt,
    })),
  };
}

/** The inputs of the permission rules for a task, its trainees too (10. mérföldkő). */
export function taskAssignment(task: TaskView) {
  const traineeOf = (part: Part) => task.ojt.find((session) => session.part === part)?.trainee.id ?? null;
  return {
    arrivalAgentId: task.arrivalAgent?.id ?? null,
    departureAgentId: task.departureAgent?.id ?? null,
    type: task.timeline.shape.type,
    arrivalTraineeId: traineeOf("ARRIVAL_PART"),
    departureTraineeId: traineeOf("DEPARTURE_PART"),
  };
}

export async function getTaskView(id: string): Promise<TaskView | null> {
  const [task, settings] = await Promise.all([
    prisma.task.findUnique({ where: { id }, include: taskInclude }),
    getSettings(),
  ]);
  return task ? toTaskView(task, settings.deviationThresholds) : null;
}

/**
 * Turnarounds that show on the given Budapest day (decision 1): the day their
 * arrival anchor or effective departure falls on, ordered by the arrival anchor.
 * With several tasks per flight (5. mérföldkő) the day and the order are the
 * flight's, from its primary task, and a flight's tasks come together. The
 * database fetches a wider set by the stored times; tasksForDay decides.
 * `keep` narrows the result after the day is decided, so a flight still counts
 * by its primary task when that is not among the ones kept.
 */
export async function listTaskViewsForDay(
  localDate: string,
  keep: (view: TaskView) => boolean = () => true,
  options: { personId?: string } = {},
): Promise<TaskView[]> {
  const day = localDayRange(localDate);
  const window = candidateWindow(day);
  const inWindow = { gte: window.start, lt: window.end };
  const settings = await getSettings();
  const tasks = await prisma.task.findMany({
    where: {
      AND: [
        {
          // Every task of a flight comes along: the day is the flight's.
          flight: {
            OR: [
              { sta: inWindow },
              { eta: inWindow },
              { ata: inWindow },
              { std: inWindow },
              { etd: inWindow },
              { atd: inWindow },
              // An agent's ATA or ATD record can be the effective actual (rule 9).
              {
                tasks: {
                  some: {
                    records: {
                      some: { actualTime: inWindow, milestoneDefinition: { code: { in: [ATA_CODE, ATD_CODE] } } },
                    },
                  },
                },
              },
            ],
          },
        },
        // Only the flights the person works on, with all their tasks (13. mérföldkő,
        // utómunka, 6. pont): the same as flightsWorkedOn, in the database.
        ...(options.personId
          ? [
              {
                flight: {
                  tasks: {
                    some: {
                      OR: [
                        { arrivalAgentId: options.personId },
                        { departureAgentId: options.personId },
                        { ojtSessions: { some: { traineeId: options.personId } } },
                      ],
                    },
                  },
                },
              },
            ]
          : []),
      ],
    },
    include: taskInclude,
  });
  const views = tasks.map((task) => toTaskView(task, settings.deviationThresholds));
  return tasksForDay(
    views,
    (view) => ({ flightId: view.flight.id, isPrimary: view.isPrimary, sortKey: view.taskType.code }),
    (view) => dayAnchors(view.timeline),
    day,
  ).filter(keep);
}

/** The other tasks of a flight (5. mérföldkő), with what the permission rules need. */
export async function listFlightTasks(flightId: string) {
  const tasks = await prisma.task.findMany({
    where: { flightId },
    select: {
      id: true,
      isPrimary: true,
      arrivalAgentId: true,
      departureAgentId: true,
      taskType: { select: { name: true, code: true } },
    },
  });
  return tasks.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.taskType.code.localeCompare(b.taskType.code));
}

/**
 * The day's tasks per flight, in list order (5. mérföldkő). listTaskViewsForDay
 * keeps a flight's tasks together with the primary one first, so it leads.
 */
export function groupByFlight(tasks: readonly TaskView[]): { primary: TaskView; tasks: TaskView[] }[] {
  const groups: { primary: TaskView; tasks: TaskView[] }[] = [];
  for (const task of tasks) {
    const last = groups.at(-1);
    if (last && last.primary.flight.id === task.flight.id) last.tasks.push(task);
    else groups.push({ primary: task, tasks: [task] });
  }
  return groups;
}

/**
 * The agents actually working each part of a flight, over all its tasks
 * (7. mérföldkő: who sees and sends its messages). A quick turnaround's
 * departure is its arrival agent's (rule 8).
 */
export async function flightPartAgents(flightId: string): Promise<{ arrival: string[]; departure: string[] }> {
  const tasks = await prisma.task.findMany({ where: { flightId }, select: { id: true } });
  const views = (await Promise.all(tasks.map((task) => getTaskView(task.id)))).filter((view): view is TaskView => !!view);
  const ids = (list: (string | null | undefined)[]) => [...new Set(list.filter((id): id is string => !!id))];
  return {
    arrival: ids(views.map((view) => view.arrivalAgent?.id)),
    departure: ids(views.map((view) => view.effectiveDepartureAgent?.id)),
  };
}

/** The primary task of a flight (rule 30: flight-level display follows it). */
export async function primaryTaskView(flightId: string): Promise<TaskView | null> {
  const primary = await prisma.task.findFirst({ where: { flightId, isPrimary: true }, select: { id: true } });
  return primary ? getTaskView(primary.id) : null;
}

/** Whether the person works on a task: as its arrival or departure agent, or as a trainee on it. */
export function worksOnTask(view: Pick<TaskView, "arrivalAgent" | "departureAgent" | "ojt">, personId: string): boolean {
  return view.arrivalAgent?.id === personId || view.departureAgent?.id === personId || view.ojt.some((session) => session.trainee.id === personId);
}
