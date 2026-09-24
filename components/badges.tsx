import type { TaskStatus } from "@/generated/prisma/enums";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import type { Lateness } from "@/lib/flight";
import { formatDayShort, formatTime, toLocalDate } from "@/lib/time";
import type { DeviationLevel, FlightKind, TurnaroundType } from "@/lib/turnaround";

const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap";

const statusStyle: Record<TaskStatus, string> = {
  PLANNED: "bg-neutral-100 text-neutral-700",
  IN_PROGRESS: "bg-sky-100 text-sky-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`${base} ${statusStyle[status]}`}>{messages.status[status]}</span>;
}

/** Quick or long turnaround; a one-sided flight (rule 11) shows its kind instead. */
export function TypeBadge({ type, kind }: { type: TurnaroundType | null; kind: FlightKind }) {
  if (!type) return <span className={`${base} bg-teal-100 text-teal-800`}>{messages.flightKind[kind]}</span>;
  const style = type === "QUICK" ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-800";
  return <span className={`${base} ${style}`}>{messages.turnaroundType[type]}</span>;
}

const deviationStyle: Record<DeviationLevel, string> = {
  green: "bg-emerald-100 text-emerald-800",
  yellow: "bg-yellow-100 text-yellow-900",
  red: "bg-red-100 text-red-800",
};

export function DeviationBadge({ minutes, level }: { minutes: number; level: DeviationLevel }) {
  const sign = minutes > 0 ? "+" : "";
  return (
    <span className={`${base} ${deviationStyle[level]}`}>
      {fmt(messages.times.minutes, { minutes: `${sign}${minutes}` })}
    </span>
  );
}

export function DelayBadge({ minutes }: { minutes: number | null }) {
  if (!minutes) return null;
  return <span className={`${base} bg-red-100 text-red-800`}>{fmt(messages.times.delay, { minutes })}</span>;
}

/** "Késik", with the original scheduled day and time ("Késés és törlés"). */
export function LateBadge({ late }: { late: Lateness }) {
  if (!late.late || !late.scheduled) return null;
  const scheduled = `${formatDayShort(toLocalDate(late.scheduled))} ${formatTime(late.scheduled)}`;
  return (
    <span className={`${base} bg-orange-100 text-orange-800`}>{fmt(messages.late.scheduled, { time: scheduled })}</span>
  );
}

/** "Törölt járat" when both parts are cancelled, otherwise one badge per cancelled part. */
export function CancelBadges({ arrival, departure }: { arrival: boolean; departure: boolean }) {
  const style = `${base} bg-neutral-800 text-white`;
  if (arrival && departure) return <span className={style}>{messages.cancel.flightCancelled}</span>;
  return (
    <>
      {arrival && (
        <span className={style}>{fmt(messages.cancel.partCancelled, { part: messages.part.ARRIVAL_PART })}</span>
      )}
      {departure && (
        <span className={style}>{fmt(messages.cancel.partCancelled, { part: messages.part.DEPARTURE_PART })}</span>
      )}
    </>
  );
}
