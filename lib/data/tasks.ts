import type { Prisma } from "@/generated/prisma/client";
import type { TaskStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { parseTemplateSnapshot } from "@/lib/snapshot";
import { localDayRange } from "@/lib/time";
import {
  computeTimeline,
  effectiveDepartureAgentId,
  type MilestoneDef,
  type TemplateParams,
  type Timeline,
} from "@/lib/turnaround";

const personSelect = { select: { id: true, name: true } } as const;

const taskInclude = {
  flight: { include: { airline: true, template: { include: { milestones: true } } } },
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

export interface TaskView {
  id: string;
  status: TaskStatus;
  flight: {
    id: string;
    inboundFlightNumber: string;
    outboundFlightNumber: string;
    stand: string;
    sta: Date;
    eta: Date | null;
    std: Date;
    etd: Date | null;
    ata: Date | null;
    atd: Date | null;
    airline: { name: string; iataCode: string };
    templateName: string;
  };
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
  const { template } = task.flight;
  return {
    params: template,
    milestones: template.milestones,
    frozen: false,
  };
}

function toTaskView(task: TaskWithRelations): TaskView {
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
      templateName: flight.template.name,
    },
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

export async function getTaskView(id: string): Promise<TaskView | null> {
  const task = await prisma.task.findUnique({ where: { id }, include: taskInclude });
  return task ? toTaskView(task) : null;
}

/**
 * Turnarounds whose STA or STD falls on the given Budapest day (provisional
 * decision 1), ordered by STA.
 */
export async function listTaskViewsForDay(
  localDate: string,
  extraWhere: Prisma.TaskWhereInput = {},
): Promise<TaskView[]> {
  const { start, end } = localDayRange(localDate);
  const tasks = await prisma.task.findMany({
    where: {
      ...extraWhere,
      flight: {
        OR: [
          { sta: { gte: start, lt: end } },
          { std: { gte: start, lt: end } },
        ],
      },
    },
    include: taskInclude,
    orderBy: { flight: { sta: "asc" } },
  });
  return tasks.map(toTaskView);
}
