import { messages } from "@/lib/messages";
import { canManageFlights } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";

export default async function FlightsPage() {
  await requireCapability(canManageFlights);
  return <h1 className="text-2xl font-bold">{messages.pages.flights}</h1>;
}
