import { PartStateBadge, ProcessStateBadge } from "@/components/badges";
import type { ProcessRow } from "@/lib/data/processes";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";

// Where a training process stands (CLAUDE.md, 10. mérföldkő): its state and
// each prescribed part, with the OJT count.

const p = messages.processes;

export function ProcessSummary({ process }: { process: Pick<ProcessRow, "state" | "parts" | "ojt"> }) {
  const { parts, ojt } = process;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <ProcessStateBadge state={process.state} />
      {parts.theory !== "NOT_REQUIRED" && <PartStateBadge label={p.parts.theory} state={parts.theory} />}
      {parts.ojt !== "NOT_REQUIRED" && (
        <PartStateBadge label={`${p.parts.ojt} ${fmt(p.ojtProgress, { suitable: ojt.suitable, required: ojt.required })}`} state={parts.ojt} />
      )}
      {parts.practical !== "NOT_REQUIRED" && <PartStateBadge label={p.parts.practical} state={parts.practical} />}
    </span>
  );
}
