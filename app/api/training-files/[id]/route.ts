import type { NextRequest } from "next/server";
import { readTrainingFile } from "@/lib/data/training-files";
import { canViewTrainingOf } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";

// Download of a training record's file (CLAUDE.md, 6. mérföldkő, "Fájlok"):
// the same permission and scope as viewing the record.
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/training-files/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });
  const { id } = await ctx.params;
  const file = await readTrainingFile(id);
  // The same answer for a missing file and a forbidden one: nothing to learn from it.
  if (!file || !canViewTrainingOf(user, file.userId)) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(file.content), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
