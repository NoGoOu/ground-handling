import Link from "next/link";
import { notFound } from "next/navigation";
import { EquipmentStatusBadge, FaultStatusBadge } from "@/components/badges";
import { FormMessage } from "@/components/form-field";
import { RowButton } from "@/components/row-button";
import { getFault } from "@/lib/data/faults";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canManageFaults, canViewEquipment, canViewFault } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { formatDateTime } from "@/lib/time";
import { addCommentAction, closeFaultAction, takeFaultAction } from "../actions";
import { CloseFaultForm, CommentForm } from "./forms";

// One fault (CLAUDE.md, 11. mérföldkő, "Hibajegy"): its reporter always sees
// it, the others by the scope of viewing faults; the technical staff take it
// over, comment on it and close it.

const f = messages.faults;

export default async function FaultPage(props: PageProps<"/faults/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  const { sent } = await props.searchParams;
  const fault = await getFault(id);
  if (!fault || !canViewFault(user, fault)) notFound();
  const manage = canManageFaults(user) && fault.status !== "CLOSED";
  return (
    <div className="flex flex-col gap-4">
      <Link href="/faults" className="self-start text-sm text-sky-700 hover:underline">
        {f.back}
      </Link>
      {sent && <FormMessage notice={f.sent} />}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">
          {canViewEquipment(user) ? (
            <Link href={`/equipment/${fault.equipment.id}`} className="hover:underline">
              {fault.equipment.identifier}
            </Link>
          ) : (
            fault.equipment.identifier
          )}
        </h1>
        <span className="text-neutral-600">{fault.equipment.type.name}</span>
        <FaultStatusBadge status={fault.status} />
        <EquipmentStatusBadge status={fault.equipment.status} />
      </div>
      <section className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4">
        <p className="text-sm text-neutral-600">{fmt(f.reportedBy, { name: fault.reportedBy.name, time: formatDateTime(fault.reportedAt) })}</p>
        {fault.takenBy && fault.takenAt && <p className="text-sm text-neutral-600">{fmt(f.taken, { name: fault.takenBy.name, time: formatDateTime(fault.takenAt) })}</p>}
        {fault.closedBy && fault.closedAt && fault.resolution && (
          <p className="text-sm font-medium text-neutral-700">
            {fmt(f.closed, { name: fault.closedBy.name, time: formatDateTime(fault.closedAt), resolution: f.resolutions[fault.resolution] })}
          </p>
        )}
        {fault.reportedOutOfService && <p className="text-sm font-medium text-red-700">{f.reportedOutOfService}</p>}
        <p className="text-base whitespace-pre-line">{fault.description}</p>
        {fault.photos.length === 0 ? (
          <p className="text-sm text-neutral-500">{f.noPhotos}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {fault.photos.map((photo) => (
              <li key={photo.id}>
                <a href={`/api/fault-photos/${photo.id}`} target="_blank" rel="noopener noreferrer" title={fmt(f.photoTitle, { name: photo.fileName })}>
                  {photo.mimeType.startsWith("image/") ? (
                    // A thumbnail of the user's own upload, served by our route.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/fault-photos/${photo.id}`} alt={photo.fileName} className="h-28 w-28 rounded-lg border border-neutral-200 object-cover" />
                  ) : (
                    <span className="flex h-28 w-28 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 p-2 text-center text-xs break-all text-sky-700">
                      {photo.fileName}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {manage && (
        <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="font-semibold">{f.manageTitle}</h2>
          {fault.status === "OPEN" && <RowButton action={takeFaultAction.bind(null, fault.id)} label={f.take} />}
          <div className="flex flex-col gap-2 border-t border-neutral-100 pt-3">
            <h3 className="font-medium">{f.closeTitle}</h3>
            <CloseFaultForm action={closeFaultAction.bind(null, fault.id)} outOfService={fault.equipment.status === "OUT_OF_SERVICE"} />
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{f.commentsTitle}</h2>
        {fault.comments.length === 0 ? (
          <p className="text-sm text-neutral-600">{f.noComments}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {fault.comments.map((comment) => (
              <li key={comment.id} className="rounded-lg bg-neutral-50 p-2 text-sm">
                <p className="text-xs text-neutral-500">{fmt(f.commentRow, { name: comment.author.name, time: formatDateTime(comment.createdAt) })}</p>
                <p className="whitespace-pre-line">{comment.text}</p>
              </li>
            ))}
          </ul>
        )}
        {canManageFaults(user) && <CommentForm action={addCommentAction.bind(null, fault.id)} />}
      </section>

      <section className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-sm">
        <h2 className="font-semibold">{f.eventsTitle}</h2>
        <ul className="flex flex-col gap-0.5">
          {fault.events.map((event) => (
            <li key={event.id}>
              {fmt(f.eventRow, {
                time: formatDateTime(event.createdAt),
                from: event.fromStatus ? f.statuses[event.fromStatus] : f.reported,
                to: f.statuses[event.toStatus],
                name: event.createdBy.name,
              })}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
