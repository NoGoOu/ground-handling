import { completenessOf, isSuitable, metricsMeet, onTimeOf, traineeShareOf, type OjtMetrics, type OjtRequirement } from "@/lib/exams/ojt";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";

// The metrics of a practice (CLAUDE.md, 10. mérföldkő, "Értékelés
// gyakorlásonként") and whether it counts as suitable.

const o = messages.ojt;
const percent = (value: number | null) => (value === null ? o.noData : fmt(o.percent, { n: value }));

export function OjtMetricsView({ metrics }: { metrics: OjtMetrics }) {
  return (
    <ul className="flex flex-col gap-0.5 text-sm tabular-nums">
      <li>{fmt(o.completeness, { done: metrics.requiredDone, total: metrics.requiredTotal, percent: percent(completenessOf(metrics)) })}</li>
      <li>{fmt(o.traineeShare, { own: metrics.byTrainee, total: metrics.recordedTotal, percent: percent(traineeShareOf(metrics)) })}</li>
      <li>
        {fmt(o.colours, {
          green: metrics.deviations.green,
          yellow: metrics.deviations.yellow,
          red: metrics.deviations.red,
          percent: percent(onTimeOf(metrics)),
        })}
      </li>
    </ul>
  );
}

/** Whether an evaluated practice counts, and why not when it does not. */
export function Suitability({
  session,
  requirement,
}: {
  session: { verdict: "PASS" | "FAIL" | null; metrics: OjtMetrics | null };
  requirement: OjtRequirement;
}) {
  if (!session.verdict) return null;
  if (isSuitable(session, requirement)) return <p className="text-sm font-semibold text-emerald-700">{o.suitable}</p>;
  const reason = session.verdict !== "PASS" ? o.reasons.verdict : session.metrics && !metricsMeet(session.metrics, requirement) ? o.reasons.metrics : o.reasons.verdict;
  return <p className="text-sm font-semibold text-red-700">{fmt(o.notSuitable, { reason })}</p>;
}
