import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { uploadDir } from "@/lib/data/storage";
import { prisma } from "@/lib/db";
import { appVersion } from "@/lib/ops/version";

// The health of the app (CLAUDE.md, 13. mérföldkő, "Állapotfigyelés"): is the
// database there, can the upload directory be written, which version runs.
// Open without signing in, so it says nothing more than that; Docker's health
// check and an outside uptime monitor read it.

export const dynamic = "force-dynamic";

async function databaseOk(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

async function uploadsOk(): Promise<boolean> {
  const dir = uploadDir();
  const probe = path.join(/* turbopackIgnore: true */ dir, `.health-${randomUUID()}`);
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(probe, "");
    await unlink(probe);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const [db, uploads] = await Promise.all([databaseOk(), uploadsOk()]);
  const ok = db && uploads;
  return Response.json(
    { status: ok ? "ok" : "error", db: db ? "ok" : "error", uploads: uploads ? "ok" : "error", version: appVersion() },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
