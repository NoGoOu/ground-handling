import { listTemplateOptions } from "@/lib/data/templates";
import { messages } from "@/lib/messages";
import { canManageFlights } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { createFlight } from "../actions";
import { FlightForm } from "../flight-form";

export default async function NewFlightPage() {
  await requireCapability(canManageFlights);
  const templates = await listTemplateOptions();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{messages.flightForm.newTitle}</h1>
      <FlightForm
        action={createFlight}
        templates={templates}
        submitLabel={messages.flightForm.create}
        initial={{
          templateId: templates.length === 1 ? templates[0].id : "",
          inboundFlightNumber: "",
          outboundFlightNumber: "",
          stand: "",
          sta: "",
          eta: "",
          std: "",
          etd: "",
        }}
      />
    </div>
  );
}
