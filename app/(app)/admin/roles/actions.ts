"use server";

import { refresh } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import {
  BUILT_IN_ADMIN_ROLE,
  canManageRoles,
  isPermission,
  isScope,
  PERMISSIONS,
  type Permission,
  type Scope,
} from "@/lib/permissions";

const e = messages.roleForm.errors;

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function createRole(_previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canManageRoles);
    const name = String(formData.get("name") ?? "").trim();
    if (name.length === 0 || name.length > 60) throw new ActionError(e.name);

    try {
      await prisma.role.create({ data: { name } });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ActionError(e.nameTaken);
      throw error;
    }
    refresh();
  });
}

/**
 * Saves the whole role × permission matrix. A permission is ticked when its
 * checkbox arrives as "<roleId>:<permission>"; the scope comes from the select
 * next to it.
 */
export async function saveRoleMatrix(_previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await actionUser(canManageRoles);
    const roles = await prisma.role.findMany({ select: { id: true, name: true, builtIn: true } });

    const ticked = new Map<string, Map<Permission, Scope>>();
    for (const value of formData.getAll("granted")) {
      if (typeof value !== "string") continue;
      const [roleId, permission] = value.split(":");
      if (!isPermission(permission)) continue;
      const rawScope = formData.get(`scope:${roleId}:${permission}`);
      const scope: Scope = PERMISSIONS[permission].scoped && isScope(rawScope) ? rawScope : "ALL";
      const forRole = ticked.get(roleId) ?? new Map<Permission, Scope>();
      forRole.set(permission, scope);
      ticked.set(roleId, forRole);
    }

    await prisma.$transaction(async (tx) => {
      for (const role of roles) {
        // The built-in Admin role is locked.
        if (role.builtIn && role.name === BUILT_IN_ADMIN_ROLE) continue;
        const grants = ticked.get(role.id) ?? new Map<Permission, Scope>();
        await tx.rolePermission.deleteMany({
          where: { roleId: role.id, permission: { notIn: [...grants.keys()] } },
        });
        for (const [permission, scope] of grants) {
          await tx.rolePermission.upsert({
            where: { roleId_permission: { roleId: role.id, permission } },
            create: { roleId: role.id, permission, scope },
            update: { scope },
          });
        }
      }
    });
    refresh();
  });
}
