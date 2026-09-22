import { messages } from "@/lib/messages";
import { canAdminister } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { createAirline } from "../actions";
import { AirlineForm } from "../airline-form";

export default async function NewAirlinePage() {
  await requireCapability(canAdminister);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{messages.airlineForm.newTitle}</h1>
      <AirlineForm action={createAirline} initial={{ name: "", iataCode: "" }} submitLabel={messages.airlineForm.create} />
    </div>
  );
}
