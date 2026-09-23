"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { countActiveAdmins } from "@/lib/data/users";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { BUILT_IN_ADMIN_ROLE, canManageUsers } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
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
        passwordHash: await bcrypt.hash(password, 10),
        roles: { create: roleIds.map((roleId) => ({ roleId })) },
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { errors: { username: e.usernameTaken }, values: echo(values, roleIds) };
    throw error;
  }
  redirect("/admin/users");
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
        data: { ...data, ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}) },
      });
      await tx.userRole.deleteMany({ where: { userId, roleId: { notIn: roleIds.length > 0 ? roleIds : ["-"] } } });
      for (const roleId of roleIds) {
        await tx.userRole.upsert({
          where: { userId_roleId: { userId, roleId } },
          create: { userId, roleId },
          update: {},
        });
      }
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { errors: { username: e.usernameTaken }, values: echo(values, roleIds) };
    throw error;
  }
  redirect("/admin/users");
}
