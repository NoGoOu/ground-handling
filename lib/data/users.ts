import { prisma } from "@/lib/db";

/** Agents for assignment pickers: all active agents, plus inactive ones still assigned somewhere. */
export async function listAgentOptions(assignedIds: (string | null)[] = []) {
  const ids = assignedIds.filter((id): id is string => !!id);
  const agents = await prisma.user.findMany({
    where: { role: "AGENT", OR: [{ active: true }, { id: { in: ids } }] },
    select: { id: true, name: true, active: true },
    orderBy: { name: "asc" },
  });
  return agents;
}
