import type { DeviationLevel, Part, TimelineRow, TurnaroundType } from "@/lib/turnaround";

// On the job training (CLAUDE.md, 10. mérföldkő, "On the job gyakorlás"): a
// trainee works a task part next to its agent, the mentor. After the task the
// mentor says pass or fail; beside it stand metrics from the part's records.
// A practice is suitable when the mentor passed it and its metrics reach the
// training's thresholds; the requirement is met with enough suitable ones.

/** The parts a session covers: on a quick turnaround the arrival one is the whole task (rule 8). */
export function sessionParts(part: Part, type: TurnaroundType | null): Part[] | null {
  if (type !== "QUICK") return [part];
  return part === "ARRIVAL_PART" ? ["ARRIVAL_PART", "DEPARTURE_PART"] : null;
}

/** The trainee working a part: on a quick turnaround the arrival trainee does both, like the agent. */
export function effectiveTraineeId(
  type: TurnaroundType | null,
  part: Part,
  trainees: { arrival: string | null; departure: string | null },
): string | null {
  if (part === "ARRIVAL_PART" || type === "QUICK") return trainees.arrival;
  return trainees.departure;
}

export interface OjtMetrics {
  /** Required milestones of the parts, and those with an actual time (the effective one on ATA and ATD). */
  requiredTotal: number;
  requiredDone: number;
  /** Records of the parts, and those the trainee made. */
  recordedTotal: number;
  byTrainee: number;
  /** Rows with an actual time, by the colour of their deviation. */
  deviations: Record<DeviationLevel, number>;
}

/**
 * The metrics of a practice from the task's rows: the required milestones
 * done, the trainee's share of the records, and the deviations by colour. A
 * cancelled part is not worked, so its rows do not count.
 */
export function ojtMetrics(
  rows: readonly Pick<TimelineRow, "milestone" | "actual" | "deviationLevel" | "cancelled">[],
  records: readonly { milestoneId: string; byTrainee: boolean }[],
  parts: readonly Part[],
): OjtMetrics {
  const own = rows.filter((row) => parts.includes(row.milestone.part) && !row.cancelled);
  const ids = new Set(own.map((row) => row.milestone.id));
  const required = own.filter((row) => row.milestone.required);
  const recorded = records.filter((record) => ids.has(record.milestoneId));
  const deviations: Record<DeviationLevel, number> = { green: 0, yellow: 0, red: 0 };
  for (const row of own) if (row.deviationLevel) deviations[row.deviationLevel]++;
  return {
    requiredTotal: required.length,
    requiredDone: required.filter((row) => row.actual !== null).length,
    recordedTotal: recorded.length,
    byTrainee: recorded.filter((record) => record.byTrainee).length,
    deviations,
  };
}

/** A share in whole percent, rounded down; null without anything to count. */
export function sharePercent(part: number, total: number): number | null {
  return total === 0 ? null : Math.floor((part * 100) / total);
}

export const completenessOf = (m: OjtMetrics) => sharePercent(m.requiredDone, m.requiredTotal);
export const traineeShareOf = (m: OjtMetrics) => sharePercent(m.byTrainee, m.recordedTotal);
export const onTimeOf = (m: OjtMetrics) => sharePercent(m.deviations.green + m.deviations.yellow, m.deviations.green + m.deviations.yellow + m.deviations.red);

export interface OjtRequirement {
  requiredCount: number;
  minCompletenessPercent: number;
  minOnTimePercent: number;
}

/** Whether part / total reaches the threshold, exactly; a zero threshold is no threshold. */
function reaches(part: number, total: number, threshold: number): boolean {
  if (threshold <= 0) return true;
  return total > 0 && part * 100 >= threshold * total;
}

/** Whether the metrics of a practice reach the training's thresholds (checked against the thresholds of now). */
export function metricsMeet(metrics: OjtMetrics, requirement: OjtRequirement): boolean {
  const onTime = metrics.deviations.green + metrics.deviations.yellow;
  return (
    reaches(metrics.requiredDone, metrics.requiredTotal, requirement.minCompletenessPercent) &&
    reaches(onTime, onTime + metrics.deviations.red, requirement.minOnTimePercent)
  );
}

export interface EvaluatedSession {
  verdict: "PASS" | "FAIL" | null;
  /** Frozen at the evaluation; null before it. */
  metrics: OjtMetrics | null;
}

export function isSuitable(session: EvaluatedSession, requirement: OjtRequirement): boolean {
  return session.verdict === "PASS" && session.metrics !== null && metricsMeet(session.metrics, requirement);
}

export interface OjtProgress {
  /** Practices evaluated and found suitable. */
  suitable: number;
  required: number;
  met: boolean;
  evaluated: number;
  /** Practices still waiting for the mentor. */
  waiting: number;
}

export function ojtProgress(sessions: readonly EvaluatedSession[], requirement: OjtRequirement): OjtProgress {
  const suitable = sessions.filter((session) => isSuitable(session, requirement)).length;
  const evaluated = sessions.filter((session) => session.verdict !== null).length;
  return {
    suitable,
    required: requirement.requiredCount,
    met: suitable >= requirement.requiredCount,
    evaluated,
    waiting: sessions.length - evaluated,
  };
}

/** Reads frozen metrics back; their shape is ours. */
export function readMetrics(value: unknown): OjtMetrics | null {
  const metrics = value as OjtMetrics | null;
  return metrics && typeof metrics.requiredTotal === "number" ? metrics : null;
}
