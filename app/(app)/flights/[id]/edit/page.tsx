import { notFound } from "next/navigation";
import { estimateText } from "@/components/estimate-note";
import { listTemplateOptions } from "@/lib/data/templates";
import { prisma } from "@/lib/db";
import { flightLabel } from "@/lib/flight";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canManageFlights } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { formatDateTime, toLocalDateTimeInput } from "@/lib/time";
import type { Part } from "@/lib/turnaround";
import { recordDelay, setPartCancelled, updateFlight } from "../../actions";
import { FlightForm } from "../../flight-form";
import { CancelToggle, DelayForm } from "./delay-forms";

const t = messages.flightForm;
const person = { select: { name: true } } as const;

export default async function EditFlightPage(props: PageProps<"/flights/[id]/edit">) {
  await requireCapability(canManageFlights);
  const { id } = await props.params;
  const [flight, templates, events] = await Promise.all([
    prisma.flight.findUnique({
      where: { id },
      include: {
        etaRecordedBy: person,
        etdRecordedBy: person,
        arrivalCancelledBy: person,
        departureCancelledBy: person,
      },
    }),
    listTemplateOptions(),
    prisma.flightEvent.findMany({
      where: { flightId: id },
      include: { createdBy: person },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!flight) notFound();

  const input = (d: Date | null) => (d ? toLocalDateTimeInput(d) : "");
  const current = (time: Date | null, info: Parameters<typeof estimateText>[0]) =>
    time ? fmt(messages.delay.current, { time: formatDateTime(time), info: estimateText(info) }) : messages.delay.none;

  // Only the parts the flight has can be cancelled or restored (rule 11).
  const parts: { part: Part; cancelled: boolean; by: string | null; at: Date | null }[] = [];
  if (flight.sta) {
    parts.push({
      part: "ARRIVAL_PART",
      cancelled: flight.arrivalCancelled,
      by: flight.arrivalCancelledBy?.name ?? null,
      at: flight.arrivalCancelledAt,
    });
  }
  if (flight.std) {
    parts.push({
      part: "DEPARTURE_PART",
      cancelled: flight.departureCancelled,
      by: flight.departureCancelledBy?.name ?? null,
      at: flight.departureCancelledAt,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">
          {t.editTitle}: {flightLabel(flight)}
        </h1>
        {(flight.ata || flight.atd) && (
          <p className="text-sm text-neutral-600">
            {fmt(t.systemTimes, {
              ata: flight.ata ? formatDateTime(flight.ata) : t.none,
              atd: flight.atd ? formatDateTime(flight.atd) : t.none,
            })}
          </p>
        )}
        <p className="text-sm text-neutral-600">{t.estimatesHint}</p>
      </div>

      <FlightForm
        action={updateFlight.bind(null, flight.id)}
        templates={templates}
        submitLabel={messages.form.save}
        initial={{
          templateId: flight.templateId,
          inboundFlightNumber: flight.inboundFlightNumber ?? "",
          outboundFlightNumber: flight.outboundFlightNumber ?? "",
          stand: flight.stand ?? "",
          sta: input(flight.sta),
          std: input(flight.std),
        }}
      />

      <section className="flex max-w-2xl flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{messages.delay.title}</h2>
        <p className="text-sm text-neutral-600">{messages.delay.hint}</p>
        <dl className="grid gap-1 text-sm sm:grid-cols-[4rem_1fr]">
          {flight.sta && (
            <>
              <dt className="text-neutral-500">{messages.times.eta}</dt>
              <dd>
                {current(flight.eta, {
                  source: flight.etaSource,
                  note: flight.etaNote,
                  by: flight.etaRecordedBy,
                  at: flight.etaRecordedAt,
                })}
              </dd>
            </>
          )}
          {flight.std && (
            <>
              <dt className="text-neutral-500">{messages.times.etd}</dt>
              <dd>
                {current(flight.etd, {
                  source: flight.etdSource,
                  note: flight.etdNote,
                  by: flight.etdRecordedBy,
                  at: flight.etdRecordedAt,
                })}
              </dd>
            </>
          )}
        </dl>
        <DelayForm
          action={recordDelay.bind(null, flight.id)}
          withEta={!!flight.sta && !flight.arrivalCancelled}
          withEtd={!!flight.std && !flight.departureCancelled}
        />
      </section>

      <section className="flex max-w-2xl flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{messages.cancel.title}</h2>
        <p className="text-sm text-neutral-600">{messages.cancel.hint}</p>
        <ul className="flex flex-col gap-3">
          {parts.map(({ part, cancelled, by, at }) => (
            <li key={part} className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="font-medium">{messages.part[part]}</span>
                <span className={`text-sm ${cancelled ? "text-red-700" : "text-neutral-600"}`}>
                  {!cancelled
                    ? messages.cancel.active
                    : by && at
                      ? fmt(messages.cancel.cancelledBy, { name: by, time: formatDateTime(at) })
                      : fmt(messages.cancel.partCancelled, { part: messages.part[part] })}
                </span>
              </div>
              <CancelToggle action={setPartCancelled.bind(null, flight.id, part, !cancelled)} cancelled={cancelled} />
            </li>
          ))}
        </ul>
      </section>

      <section className="flex max-w-2xl flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{messages.events.title}</h2>
        {events.length === 0 ? (
          <p className="text-sm text-neutral-600">{messages.events.empty}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 text-sm">
            {events.map((event) => (
              <li key={event.id} className="flex flex-col gap-0.5 py-2">
                <span>
                  <span className="font-medium">{messages.events.kind[event.kind]}</span>
                  {event.part && <> · {messages.part[event.part]}</>}
                  <span className="text-neutral-500">
                    {" "}
                    · {event.createdBy.name}, {formatDateTime(event.createdAt)}
                  </span>
                </span>
                {event.kind === "DELAY" && (
                  <span className="text-neutral-600">
                    {fmt(messages.events.estimates, {
                      eta: event.eta ? formatDateTime(event.eta) : t.none,
                      etd: event.etd ? formatDateTime(event.etd) : t.none,
                    })}
                    {event.note && <> · {event.note}</>}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
