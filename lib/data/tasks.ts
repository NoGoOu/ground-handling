import type { Prisma } from "@/generated/prisma/client";
import type { EstimateSource, TaskStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { lateness, type Lateness } from "@/lib/flight";
import { candidateWindow, dayAnchors, forDay } from "@/lib/flight-day";
import { parseTemplateSnapshot } from "@/lib/snapshot";
import { getSettings } from "@/lib/settings";
import { localDayRange } from "@/lib/time";
import {
  ATA_CODE,
  ATD_CODE,
  computeTimeline,
  effectiveDepartureAgentId,
  type DeviationThresholds,
  type MilestoneDef,
  type TemplateParams,
  type Timeline,
} from "@/lib/turnaround";

const personSelect = { select: { id: true, name: true } } as const;

const taskInclude = {
  template: { include: { milestones: true } },
  flight: {
    include: {
      airline: true,
      etaRecordedBy: personSelect,
      etdRecordedBy: personSelect,
      arrivalCancelledBy: personSelect,
      departureCancelledBy: personSelect,
    },
  },
  arrivalAgent: personSelect,
  departureAgent: personSelect,
  records: { include: { recordedBy: personSelect, updatedBy: personSelect } },
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
  flight: {
    id: string;
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
}

function templateFor(task: TaskWithRelations): { params: TemplateParams; milestones: MilestoneDef[]; frozen: boolean } {
  const snapshot = task.status === "COMPLETED" ? parseTemplateSnapshot(task.templateSnapshot) : null;
  if (snapshot) return { ...snapshot, frozen: true };
  const { template } = task;
  return {
    params: template,
    milestones: template.milestones,
    frozen: false,
  };
}

function toTaskView(task: TaskWithRelations, thresholds: DeviationThresholds): TaskView {
  const { flight } = task;
  const { params, milestones, frozen } = templateFor(task);
  const records = new Map<string, RecordInfo>(
    task.records.map((r) => [
      r.milestoneDefinitionId,
      {
        actualTime: r.actualTime,
        recordedBy: r.recordedBy,
        recordedAt: r.recordedAt,
        updatedBy: r.updatedBy,
        updatedAt: r.updatedAt,
      },
    ]),
  );
  const timeline = computeTimeline({
    flight,
    params,
    milestones,
    recorded: new Map([...records].map(([id, r]) => [id, r.actualTime])),
    thresholds,
  });
  const departureAgentId = effectiveDepartureAgentId(
    timeline.shape.type,
    task.arrivalAgentId,
    task.departureAgentId,
  );

  return {
    id: task.id,
    status: task.status,
    flight: {
      id: flight.id,
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
  };
}

/** The inputs of the permission rules for a task. */
export function taskAssignment(task: TaskView) {
  return {
    arrivalAgentId: task.arrivalAgent?.id ?? null,
    departureAgentId: task.departureAgent?.id ?? null,
    type: task.timeline.shape.type,
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
 * The database fetches a wider set by the stored times; forDay decides.
 */
export async function listTaskViewsForDay(
  localDate: string,
  extraWhere: Prisma.TaskWhereInput = {},
): Promise<TaskView[]> {
  const day = localDayRange(localDate);
  const window = candidateWindow(day);
  const inWindow = { gte: window.start, lt: window.end };
  const settings = await getSettings();
  const tasks = await prisma.task.findMany({
    where: {
      AND: [
        extraWhere,
        {
          OR: [
            {
              flight: {
                OR: [
                  { sta: inWindow },
                  { eta: inWindow },
                  { ata: inWindow },
                  { std: inWindow },
                  { etd: inWindow },
                  { atd: inWindow },
                ],
              },
            },
            // An agent's ATA or ATD record can be the effective actual (rule 9).
            {
              records: {
                some: { actualTime: inWindow, milestoneDefinition: { code: { in: [ATA_CODE, ATD_CODE] } } },
              },
            },
          ],
        },
      ],
    },
    include: taskInclude,
  });
  const views = tasks.map((task) => toTaskView(task, settings.deviationThresholds));
  return forDay(views, (view) => dayAnchors(view.timeline), day);
}
