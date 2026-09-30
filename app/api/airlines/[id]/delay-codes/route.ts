import type { NextRequest } from "next/server";
import { readDelayDocument } from "@/lib/data/delay-documents";
import { pdfResponse } from "@/lib/pdf-response";
import { canManageMessaging } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";

// An airline's delay code document for whoever uploads them (CLAUDE.md,
// 8. mérföldkő, utómunka); from a flight it opens at /api/flights/[id]/delay-codes.
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/airlines/[id]/delay-codes">) {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });
  const { id } = await ctx.params;
  const file = canManageMessaging(user) ? await readDelayDocument(id) : null;
  return file ? pdfResponse(file) : new Response(null, { status: 404 });
}
