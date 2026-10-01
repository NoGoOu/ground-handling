import type { NextRequest } from "next/server";
import { readEquipmentDocument } from "@/lib/data/equipment";
import { canViewEquipment } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";

// A document of a piece of equipment (CLAUDE.md, 11. mérföldkő): for whoever
// may see the equipment. Its type was checked by its first bytes on upload.
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/equipment-files/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });
  const { id } = await ctx.params;
  const file = canViewEquipment(user) ? await readEquipmentDocument(id) : null;
  if (!file) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(file.content), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
