import { prisma } from "@/lib/db";

/** All templates with their airline, for template pickers. */
export async function listTemplateOptions() {
  const templates = await prisma.turnaroundTemplate.findMany({
    include: { airline: { select: { name: true, iataCode: true } } },
    orderBy: [{ airline: { name: "asc" } }, { name: "asc" }],
  });
  return templates.map((tpl) => ({
    id: tpl.id,
    name: tpl.name,
    airline: `${tpl.airline.name} (${tpl.airline.iataCode})`,
  }));
}
