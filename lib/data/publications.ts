import { prisma } from "@/lib/db";
import { localDayRange } from "@/lib/time";

export { isPublished } from "@/lib/roster";

// A publication covers whole Budapest days, stored as the UTC instant of local
// midnight (CLAUDE.md, "Beosztás rétegei"). A day may be published only once.

export interface PublishedPeriod {
  id: string;
  startDate: Date;
  endDate: Date;
  publishedAt: Date;
  publishedBy: { name: string };
}

/** Publications that touch the given Budapest day range (both ends included). */
export async function listPublicationsInRange(
  startLocalDate: string,
  endLocalDate: string,
): Promise<PublishedPeriod[]> {
  return prisma.publication.findMany({
    where: {
      startDate: { lte: localDayRange(endLocalDate).start },
      endDate: { gte: localDayRange(startLocalDate).start },
    },
    select: { id: true, startDate: true, endDate: true, publishedAt: true, publishedBy: { select: { name: true } } },
    orderBy: { startDate: "asc" },
  });
}
