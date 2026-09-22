import { messages } from "@/lib/messages";
import { canAdminister } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";

export default async function AdminPage() {
  await requireCapability(canAdminister);
  return <h1 className="text-2xl font-bold">{messages.pages.admin}</h1>;
}
