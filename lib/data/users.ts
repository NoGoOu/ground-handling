import { prisma } from "@/lib/db";
import { BUILT_IN_ADMIN_ROLE } from "@/lib/permissions";

/**
 * Agents for assignment pickers. Every agent belongs to a team (CLAUDE.md,
 * "Team"), so team members are the assignable people; anyone already assigned
 * stays in the list even without a team.
 */
export async function listAgentOptions(assignedIds: (string | null)[] = []) {
  const ids = assignedIds.filter((id): id is string => !!id);
  return prisma.user.findMany({
    where: { OR: [{ active: true, teamId: { not: null } }, { id: { in: ids } }] },
    select: { id: true, name: true, active: true },
    orderBy: { name: "asc" },
  });
}

/** An assignable agent: an active user who belongs to a team. */
export async function findAssignableAgent(id: string) {
  return prisma.user.findFirst({ where: { id, active: true, teamId: { not: null } }, select: { id: true } });
}

export async function listRoles() {
  return prisma.role.findMany({ include: { permissions: true }, orderBy: [{ builtIn: "desc" }, { name: "asc" }] });
}

export async function listTeams() {
  return prisma.team.findMany({
    include: { leader: { select: { id: true, name: true } }, members: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });
}

/** Active users holding the built-in Admin role; the last one may not lose it. */
export async function countActiveAdmins(excludeUserId?: string): Promise<number> {
  return prisma.user.count({
    where: {
      active: true,
      id: excludeUserId ? { not: excludeUserId } : undefined,
      roles: { some: { role: { name: BUILT_IN_ADMIN_ROLE, builtIn: true } } },
    },
  });
}
