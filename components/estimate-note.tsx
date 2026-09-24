import type { EstimateInfo } from "@/lib/data/tasks";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { formatDateTime } from "@/lib/time";

/** "kézi · email a légitársaságtól · Vezető Viktor, 2026. 09. 24. 12:40" */
export function estimateText(info: Omit<EstimateInfo, "by"> & { by: { name: string } | null }): string {
  const parts = [
    info.source ? messages.estimate.source[info.source] : null,
    info.note,
    info.by && info.at ? fmt(messages.estimate.by, { name: info.by.name, time: formatDateTime(info.at) }) : null,
  ];
  return parts.filter(Boolean).join(" · ");
}

/** The source of the current ETA or ETD, next to it ("Késés és törlés"). */
export function EstimateNote({ label, info }: { label: string; info: EstimateInfo | null }) {
  if (!info) return null;
  return (
    <p className="text-xs text-neutral-500">
      <span className="font-medium">{label}</span> {estimateText(info)}
    </p>
  );
}
