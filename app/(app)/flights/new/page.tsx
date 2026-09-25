import { listAirlineOptions } from "@/lib/data/task-types";
import { messages } from "@/lib/messages";
import { canManageFlights } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { createFlight } from "../actions";
import { FlightForm } from "../flight-form";

export default async function NewFlightPage() {
  await requireCapability(canManageFlights);
  const airlines = await listAirlineOptions();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{messages.flightForm.newTitle}</h1>
      <FlightForm
        action={createFlight}
        airlines={airlines}
        submitLabel={messages.flightForm.create}
        initial={{
          airlineId: airlines.length === 1 ? airlines[0].id : "",
          inboundFlightNumber: "",
          outboundFlightNumber: "",
          stand: "",
          sta: "",
          std: "",
        }}
      />
    </div>
  );
}
