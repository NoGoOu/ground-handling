import { messages } from "@/lib/messages";
import { canUseAgentView } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";

export default async function AgentPage() {
  await requireCapability(canUseAgentView);
  return <h1 className="text-2xl font-bold">{messages.pages.agent}</h1>;
}
