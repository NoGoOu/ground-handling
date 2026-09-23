import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  effectivePermissions,
  homePathFor,
  isPermission,
  type Actor,
  type EffectivePermission,
  type GrantedPermission,
} from "@/lib/permissions";

export interface CurrentUser extends Actor {
  name: string;
  username: string;
  /** Role names, for display. */
  roleNames: string[];
  teamId: string | null;
  permissions: EffectivePermission[];
  teamMemberIds: string[];
}

/** Unknown keys (e.g. a permission removed from the catalogue) are ignored. */
function toGrants(rows: readonly { permission: string; scope: GrantedPermission["scope"] }[]): GrantedPermission[] {
  return rows
    .filter((row) => isPermission(row.permission))
    .map((row) => ({ permission: row.permission as GrantedPermission["permission"], scope: row.scope }));
}

/**
 * Loads a user with their effective permissions. Read from the database on
 * every request, so role changes and deactivation take effect immediately.
 */
export async function loadUser(userId: string): Promise<CurrentUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: { include: { role: { include: { permissions: true } } } },
      permissions: true,
      ledTeams: { include: { members: { select: { id: true } } } },
    },
  });
  if (!user?.active) return null;

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    teamId: user.teamId,
    roleNames: user.roles.map((entry) => entry.role.name),
    permissions: effectivePermissions({
      roles: user.roles.map((entry) => ({
        name: entry.role.name,
        permissions: toGrants(entry.role.permissions),
      })),
      individual: toGrants(user.permissions),
    }),
    // The "team" scope: the members of the teams this user leads.
    teamMemberIds: [...new Set(user.ledTeams.flatMap((team) => team.members.map((member) => member.id)))],
  };
}

/** The signed-in user, or null when not signed in or inactive. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  return id ? loadUser(id) : null;
});

/** For pages: redirects to the login page when nobody is signed in. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For pages: also redirects to the user's home page when the check fails. */
export async function requireCapability(allowed: (user: CurrentUser) => boolean): Promise<CurrentUser> {
  const user = await requireUser();
  if (!allowed(user)) redirect(homePathFor(user));
  return user;
}
