import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { MilestoneDef, TemplateParams } from "@/lib/turnaround";

// A completed task keeps the template as it was at completion (CLAUDE.md, "Lezárt task pillanatképe").

const minutes = z.number().int();

const snapshotSchema = z.object({
  params: z.object({
    minTurnaroundMinutes: minutes,
    travelMinutes: minutes,
    postDepartureMinutes: minutes,
    departureReportMinutes: minutes,
    minBreakMinutes: minutes,
  }),
  milestones: z.array(
    z.object({
      id: z.string(),
      order: minutes,
      code: z.string(),
      name: z.string(),
      anchor: z.enum(["ARRIVAL", "DEPARTURE"]),
      offsetMinutes: minutes,
      required: z.boolean(),
      part: z.enum(["ARRIVAL_PART", "DEPARTURE_PART"]),
    }),
  ),
});

export interface TemplateSnapshot {
  params: TemplateParams;
  milestones: MilestoneDef[];
}

export function buildTemplateSnapshot(
  template: TemplateParams & { milestones: readonly MilestoneDef[] },
): TemplateSnapshot {
  return {
    params: {
      minTurnaroundMinutes: template.minTurnaroundMinutes,
      travelMinutes: template.travelMinutes,
      postDepartureMinutes: template.postDepartureMinutes,
      departureReportMinutes: template.departureReportMinutes,
      minBreakMinutes: template.minBreakMinutes,
    },
    milestones: template.milestones.map((m) => ({
      id: m.id,
      order: m.order,
      code: m.code,
      name: m.name,
      anchor: m.anchor,
      offsetMinutes: m.offsetMinutes,
      required: m.required,
      part: m.part,
    })),
  };
}

/** The snapshot as a value for the Task.templateSnapshot JSON column (it is plain data). */
export function templateSnapshotJson(
  template: TemplateParams & { milestones: readonly MilestoneDef[] },
): Prisma.InputJsonValue {
  return buildTemplateSnapshot(template) as unknown as Prisma.InputJsonValue;
}

/** Returns null for missing or malformed snapshots. */
export function parseTemplateSnapshot(value: unknown): TemplateSnapshot | null {
  const result = snapshotSchema.safeParse(value);
  return result.success ? result.data : null;
}
