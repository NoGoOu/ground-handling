"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { revokeCalendarFeed } from "@/lib/data/calendar";
import { countActiveAdmins } from "@/lib/data/users";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { refresh } from "next/cache";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import {
  BUILT_IN_ADMIN_ROLE,
  canManageUsers,
  isPermission,
  isScope,
  PERMISSIONS,
  type Scope,
} from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { BUD_STATION_ID } from "@/lib/stations";
import { fieldErrors, formValues, type FormState } from "@/lib/validation/form";
import { editUserSchema, newUserSchema, USER_FIELDS, type UserFormInput } from "@/lib/validation/user";

export type UserFormState = FormState<UserFormInput>;

const e = messages.userForm.errors;

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/** Submitted values without the password, so it is never sent back to the browser. */
function echo(values: Record<string, string>, roleIds: string[]): Partial<UserFormInput> {
  return { ...values, password: "", roleIds } as Partial<UserFormInput>;
}

/** Only an existing team may be set. */
async function validTeamId(teamId: string | null): Promise<string | null> {
  if (!teamId) return null;
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true } });
  return team?.id ?? null;
}

/** Only roles that exist may be assigned. */
async function validRoleIds(formData: FormData): Promise<string[]> {
  const ids = formData.getAll("roleIds").filter((value): value is string => typeof value === "string");
  if (ids.length === 0) return [];
  const roles = await prisma.role.findMany({ where: { id: { in: ids } }, select: { id: true } });
  return roles.map((role) => role.id);
}

/** The last active admin may not lose the built-in Admin role or be deactivated. */
async function wouldRemoveLastAdmin(userId: string, roleIds: string[], active: boolean): Promise<boolean> {
  const adminRole = await prisma.role.findFirst({ where: { name: BUILT_IN_ADMIN_ROLE, builtIn: true }, select: { id: true } });
  if (!adminRole) return false;
  const hadAdmin = await prisma.userRole.findFirst({ where: { userId, roleId: adminRole.id } });
  if (!hadAdmin) return false;
  const keepsAdmin = active && roleIds.includes(adminRole.id);
  return !keepsAdmin && (await countActiveAdmins(userId)) === 0;
}

/**
 * The station of a role assignment (14. mérföldkő): the Admin role is for every
 * station (no station), any other for BUD until the admin pages give the
 * station (14. mérföldkő, 5. lépés).
 */
async function assignmentStation(roleId: string): Promise<string | null> {
  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { name: true, builtIn: true } });
  return role?.builtIn && role.name === BUILT_IN_ADMIN_ROLE ? null : BUD_STATION_ID;
}

export async function createUser(_previous: UserFormState, formData: FormData): Promise<UserFormState> {
  const actor = await getCurrentUser();
  if (!actor || !canManageUsers(actor)) return { message: messages.errors.forbidden };

  const values = formValues(formData, USER_FIELDS);
  const roleIds = await validRoleIds(formData);
  const parsed = newUserSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: echo(values, roleIds) };

  const { password, ...data } = parsed.data;
  try {
    await prisma.user.create({
      data: {
        ...data,
        teamId: await validTeamId(data.teamId),
        passwordHash: await bcrypt.hash(password, 10),
        defaultStationId: BUD_STATION_ID,
        roles: { create: await Promise.all(roleIds.map(async (roleId) => ({ roleId, stationId: await assignmentStation(roleId) }))) },
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { errors: { username: e.usernameTaken }, values: echo(values, roleIds) };
    throw error;
  }
  redirect("/admin/users");
}

/** Individual grants on top of the roles; there is no individual revoke. */
export async function saveUserPermissions(
  userId: string,
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canManageUsers);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new ActionError(messages.errors.notFound);

    const grants = new Map<string, Scope>();
    for (const value of formData.getAll("granted")) {
      if (typeof value !== "string" || !isPermission(value)) continue;
      const rawScope = formData.get(`scope:${value}`);
      grants.set(value, PERMISSIONS[value].scoped && isScope(rawScope) ? rawScope : "ALL");
    }

    await prisma.$transaction(async (tx) => {
      await tx.userPermission.deleteMany({ where: { userId, permission: { notIn: [...grants.keys()] } } });
      for (const [permission, scope] of grants) {
        // A grant kept is kept on its station (14. mérföldkő); a new one is BUD's for now.
        const kept = await tx.userPermission.updateMany({ where: { userId, permission }, data: { scope } });
        if (kept.count === 0) await tx.userPermission.create({ data: { userId, permission, scope, stationId: BUD_STATION_ID } });
      }
    });
    refresh();
  });
}

export async function updateUser(userId: string, _previous: UserFormState, formData: FormData): Promise<UserFormState> {
  const actor = await getCurrentUser();
  if (!actor || !canManageUsers(actor)) return { message: messages.errors.forbidden };

  const values = formValues(formData, USER_FIELDS);
  const roleIds = await validRoleIds(formData);
  const parsed = editUserSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: echo(values, roleIds) };

  const { password, ...data } = parsed.data;
  if (await wouldRemoveLastAdmin(userId, roleIds, data.active)) {
    return { message: e.lastAdmin, values: echo(values, roleIds) };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          ...data,
          teamId: await validTeamId(data.teamId),
          ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
        },
      });
      await tx.userRole.deleteMany({ where: { userId, roleId: { notIn: roleIds.length > 0 ? roleIds : ["-"] } } });
      for (const roleId of roleIds) {
        // A role kept is kept on its station (14. mérföldkő); a new one gets the default.
        if (!(await tx.userRole.findFirst({ where: { userId, roleId }, select: { id: true } }))) {
          await tx.userRole.create({ data: { userId, roleId, stationId: await assignmentStation(roleId) } });
        }
      }
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { errors: { username: e.usernameTaken }, values: echo(values, roleIds) };
    throw error;
  }
  redirect("/admin/users");
}

/** The admin revokes a user's roster calendar link (12. mérföldkő). */
export async function revokeUserCalendarFeed(userId: string): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canManageUsers);
    await revokeCalendarFeed(userId);
    refresh();
  });
}
