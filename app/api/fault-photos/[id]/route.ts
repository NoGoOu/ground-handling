import type { NextRequest } from "next/server";
import { readFaultPhoto } from "@/lib/data/faults";
import { canViewFault } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";

// A photo of a fault (CLAUDE.md, 11. mérföldkő): for whoever may see the fault.
// Its type was checked by its first bytes on upload.
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/fault-photos/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });
  const { id } = await ctx.params;
  const photo = await readFaultPhoto(id);
  // The same answer for a missing photo and a forbidden one.
  if (!photo || !canViewFault(user, { reportedById: photo.reportedById })) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(photo.content), {
    headers: {
      "Content-Type": photo.mimeType,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(photo.fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
