import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { listTemplateOptions } from "@/lib/data/templates";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canManageFlights } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { formatDateTime, toLocalDateTimeInput } from "@/lib/time";
import { updateFlight } from "../../actions";
import { FlightForm } from "../../flight-form";

const t = messages.flightForm;

export default async function EditFlightPage(props: PageProps<"/flights/[id]/edit">) {
  await requireCapability(canManageFlights);
  const { id } = await props.params;
  const [flight, templates] = await Promise.all([
    prisma.flight.findUnique({ where: { id } }),
    listTemplateOptions(),
  ]);
  if (!flight) notFound();

  const input = (d: Date | null) => (d ? toLocalDateTimeInput(d) : "");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">
        {t.editTitle}: {flight.inboundFlightNumber} / {flight.outboundFlightNumber}
      </h1>
      {(flight.ata || flight.atd) && (
        <p className="text-sm text-neutral-600">
          {fmt(t.systemTimes, {
            ata: flight.ata ? formatDateTime(flight.ata) : t.none,
            atd: flight.atd ? formatDateTime(flight.atd) : t.none,
          })}
        </p>
      )}
      <FlightForm
        action={updateFlight.bind(null, flight.id)}
        templates={templates}
        submitLabel={messages.form.save}
        initial={{
          templateId: flight.templateId,
          inboundFlightNumber: flight.inboundFlightNumber,
          outboundFlightNumber: flight.outboundFlightNumber,
          stand: flight.stand,
          sta: input(flight.sta),
          eta: input(flight.eta),
          std: input(flight.std),
          etd: input(flight.etd),
        }}
      />
    </div>
  );
}
