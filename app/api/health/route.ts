import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ db: "ok" });
  } catch {
    return Response.json({ db: "error" }, { status: 503 });
  }
}
