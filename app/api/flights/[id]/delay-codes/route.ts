import type { NextRequest } from "next/server";
import { readDelayDocument } from "@/lib/data/delay-documents";
import { prisma } from "@/lib/db";
import { pdfResponse } from "@/lib/pdf-response";
import { canOpenDelayDocument } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";

// The delay code document of a flight's airline (CLAUDE.md, 8. mérföldkő,
// utómunka), opened from the flight: by whoever sees one of its tasks.
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/flights/[id]/delay-codes">) {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });
  const { id } = await ctx.params;
  const flight = await prisma.flight.findUnique({
    where: { id },
    select: { airlineId: true, tasks: { select: { arrivalAgentId: true, departureAgentId: true } } },
  });
  // The permission rules on the stored agents; a quick turnaround's departure follows the arrival one.
  const tasks = flight?.tasks.map((task) => ({ ...task, type: null })) ?? [];
  const file = flight && canOpenDelayDocument(user, tasks) ? await readDelayDocument(flight.airlineId) : null;
  // The same answer for a missing document and a forbidden one: nothing to learn from it.
  return file ? pdfResponse(file) : new Response(null, { status: 404 });
}
