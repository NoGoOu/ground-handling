import Link from "next/link";
import { notFound } from "next/navigation";
import type { RosterLayer } from "@/generated/prisma/client";
import { getCellShifts, listSegmentTypes, type RosterSegment, type RosterShift } from "@/lib/data/shifts";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canEditLayer, canViewLayer, canViewLayerOf, canViewRoster, visibleLayers } from "@/lib/permissions";
import { segmentDifferences } from "@/lib/roster";
import { requireCapability } from "@/lib/session";
import { formatDayShort, formatTimeOnDay, parseLocalDate, toLocalDateTimeInput } from "@/lib/time";
import { addSegment, createShift, removeSegment, removeShift, updateSegment } from "./actions";
import { RemoveButton, SegmentForm, type SegmentTypeOption, type SegmentValues } from "./shift-forms";

const t = messages.shiftForm;
const layerLabels: Record<RosterLayer, string> = {
  DRAFT: messages.roster.layerDraft,
  PUBLISHED: messages.roster.layerPublished,
  ACTUAL: messages.roster.layerActual,
};

/** The block a non-operative segment casts, travel time included. */
function blockHint(segment: RosterSegment, date: string): string | null {
  if (!segment.createBlock) return null;
  const start = new Date(segment.start.getTime() - segment.travelBeforeMinutes * 60_000);
  const end = new Date(segment.end.getTime() + segment.travelAfterMinutes * 60_000);
  return fmt(t.blockHint, { start: formatTimeOnDay(start, date), end: formatTimeOnDay(end, date) });
}

function segmentValues(segment: RosterSegment, note: string | null): SegmentValues {
  return {
    segmentTypeId: segment.type.id,
    start: toLocalDateTimeInput(segment.start),
    end: toLocalDateTimeInput(segment.end),
    location: segment.location ?? "",
    description: segment.description ?? "",
    createBlock: segment.createBlock,
    travelBeforeMinutes: segment.travelBeforeMinutes,
    travelAfterMinutes: segment.travelAfterMinutes,
    note: note ?? "",
  };
}

function emptyValues(date: string, typeId: string, note = ""): SegmentValues {
  return {
    segmentTypeId: typeId,
    start: `${date}T06:00`,
    end: `${date}T14:00`,
    location: "",
    description: "",
    createBlock: false,
    travelBeforeMinutes: 0,
    travelAfterMinutes: 0,
    note,
  };
}

function SegmentSummary({ segment, date, changed }: { segment: RosterSegment; date: string; changed: boolean }) {
  const hint = blockHint(segment, date);
  return (
    <li
      className={`flex flex-wrap items-baseline gap-2 text-sm ${
        changed ? "border-l-2 border-amber-400 bg-amber-50 pl-2" : ""
      }`}
    >
      <span
        className={`rounded-md px-2 py-1 ${
          segment.type.operative ? "bg-sky-50 text-sky-900" : "bg-violet-50 text-violet-900"
        }`}
      >
        <span className="font-medium">{segment.type.name}</span>{" "}
        <span className="tabular-nums">
          {formatTimeOnDay(segment.start, date)}–{formatTimeOnDay(segment.end, date)}
        </span>
      </span>
      {segment.location && <span className="text-neutral-600">{segment.location}</span>}
      {segment.description && <span className="text-neutral-500">{segment.description}</span>}
      {hint && <span className="text-violet-700">{hint}</span>}
      {changed && <span className="text-amber-700">{t.changed}</span>}
    </li>
  );
}

function LayerSection({
  layer,
  shifts,
  date,
  userId,
  editable,
  types,
  changed,
}: {
  layer: RosterLayer;
  shifts: RosterShift[];
  date: string;
  userId: string;
  editable: boolean;
  types: SegmentTypeOption[];
  /** Segments that differ between the published and the actual layer. */
  changed: ReadonlySet<string>;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">{layerLabels[layer]}</h2>
        {!editable && (
          <span className="text-xs text-neutral-500">{layer === "PUBLISHED" ? t.locked : t.readOnly}</span>
        )}
      </div>

      {shifts.length === 0 && <p className="text-sm text-neutral-600">{t.empty}</p>}

      {shifts.map((shift) => (
        <div key={shift.id} className="flex flex-col gap-3 rounded-lg border border-neutral-100 bg-neutral-50 p-3">
          {shift.note && <p className="text-sm text-neutral-600">{shift.note}</p>}
          <ul className="flex flex-col gap-1">
            {shift.segments.map((segment) => (
              <SegmentSummary key={segment.id} segment={segment} date={date} changed={changed.has(segment.id)} />
            ))}
          </ul>

          {editable && (
            <div className="flex flex-col gap-4">
              {shift.segments.map((segment) => (
                <div key={segment.id} className="flex flex-col gap-2 border-t border-neutral-200 pt-3">
                  <SegmentForm
                    action={updateSegment.bind(null, segment.id)}
                    types={types}
                    initial={segmentValues(segment, shift.note)}
                    submitLabel={messages.form.save}
                  />
                  {shift.segments.length > 1 && (
                    <RemoveButton action={removeSegment.bind(null, segment.id)} label={t.remove} />
                  )}
                </div>
              ))}
              <div className="flex flex-col gap-2 border-t border-dashed border-neutral-300 pt-3">
                <h3 className="text-sm font-medium">{t.newSegment}</h3>
                <SegmentForm
                  action={addSegment.bind(null, shift.id)}
                  types={types}
                  initial={emptyValues(date, types[0]?.id ?? "", shift.note ?? "")}
                  submitLabel={t.add}
                />
                <RemoveButton action={removeShift.bind(null, shift.id)} label={t.removeShift} />
              </div>
            </div>
          )}
        </div>
      ))}

      {editable && (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-neutral-300 p-3">
          <h3 className="text-sm font-medium">{t.newShift}</h3>
          <SegmentForm
            action={createShift.bind(null, userId, layer)}
            types={types}
            initial={emptyValues(date, types[0]?.id ?? "")}
            submitLabel={t.add}
          />
        </div>
      )}
    </section>
  );
}

export default async function RosterCellPage(props: PageProps<"/shifts/[userId]/[date]">) {
  const user = await requireCapability(canViewRoster);
  const { userId, date } = await props.params;
  if (!parseLocalDate(date)) notFound();
  if (!canViewLayerOf(user, "ACTUAL", userId)) notFound();

  const [agent, shifts, segmentTypes] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } }),
    getCellShifts(userId, date),
    listSegmentTypes(true),
  ]);
  if (!agent) notFound();

  const segmentsOf = (layer: RosterLayer) =>
    shifts
      .filter((shift) => shift.layer === layer)
      .flatMap((shift) => shift.segments)
      .map((segment) => ({ id: segment.id, typeId: segment.type.id, start: segment.start, end: segment.end }));
  const differences = segmentDifferences(segmentsOf("PUBLISHED"), segmentsOf("ACTUAL"));
  const changed = new Set([...differences.publishedOnly, ...differences.actualOnly]);

  const types: SegmentTypeOption[] = segmentTypes.map((type) => ({
    id: type.id,
    name: type.name,
    operative: type.operative,
  }));

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/shifts?date=${date}`} className="self-start text-sm text-sky-700 hover:underline">
        {messages.roster.backToTable}
      </Link>
      <div>
        <h1 className="text-2xl font-bold">{agent.name}</h1>
        <p className="text-sm text-neutral-600">{formatDayShort(date)}</p>
      </div>
      <p className="text-sm text-neutral-600">{t.hint}</p>

      {visibleLayers(user)
        .filter((layer) => canViewLayer(user, layer))
        .map((layer) => (
          <LayerSection
            key={layer}
            layer={layer}
            shifts={shifts.filter((shift) => shift.layer === layer)}
            date={date}
            userId={userId}
            editable={canEditLayer(user, layer)}
            types={types}
            changed={changed}
          />
        ))}
    </div>
  );
}
