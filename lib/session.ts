import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { homePathFor } from "@/lib/permissions";

export interface CurrentUser {
  id: string;
  name: string;
  username: string;
  role: Role;
}

/**
 * The signed-in user, read from the database on every request so that role
 * changes and deactivation take effect immediately. Null when not signed in
 * or inactive.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, username: true, role: true, active: true },
  });
  if (!user?.active) return null;
  return { id: user.id, name: user.name, username: user.username, role: user.role };
});

/** For pages: redirects to the login page when nobody is signed in. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For pages: also redirects to the user's home page when the capability check fails. */
export async function requireCapability(allowed: (user: CurrentUser) => boolean): Promise<CurrentUser> {
  const user = await requireUser();
  if (!allowed(user)) redirect(homePathFor(user.role));
  return user;
}
