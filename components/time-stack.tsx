import { formatTimeOnDay } from "@/lib/time";

/** Scheduled time on top, then the estimated and actual times when known. */
export function TimeStack({
  day,
  entries,
}: {
  day: string;
  entries: { label: string; time: Date | null; emphasis?: boolean }[];
}) {
  if (entries.every((e) => !e.time)) return <span className="text-neutral-400">–</span>;
  return (
    <div className="flex flex-col gap-0.5 tabular-nums">
      {entries
        .filter((e) => e.time)
        .map((e) => (
          <span key={e.label} className={e.emphasis ? "font-semibold" : "text-neutral-600"}>
            <span className="mr-1 text-xs text-neutral-500">{e.label}</span>
            {formatTimeOnDay(e.time!, day)}
          </span>
        ))}
    </div>
  );
}
