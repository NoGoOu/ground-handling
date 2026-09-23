import Link from "next/link";
import { listRoles } from "@/lib/data/users";
import { messages } from "@/lib/messages";
import {
  BUILT_IN_ADMIN_ROLE,
  canManageRoles,
  isPermission,
  permissionGroups,
  type Permission,
  type Scope,
} from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { createRole, saveRoleMatrix } from "./actions";
import { NewRoleForm, RoleMatrix, type RoleColumn } from "./role-matrix";

const t = messages.roleForm;

export default async function RolesPage() {
  await requireCapability(canManageRoles);
  const roles = await listRoles();

  const columns: RoleColumn[] = roles.map((role) => ({
    id: role.id,
    name: role.name,
    locked: role.builtIn && role.name === BUILT_IN_ADMIN_ROLE,
    granted: Object.fromEntries(
      role.permissions
        .filter((entry) => isPermission(entry.permission))
        .map((entry) => [entry.permission as Permission, entry.scope as Scope]),
    ),
  }));

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin" className="self-start text-sm text-sky-700 hover:underline">
        {messages.admin.back}
      </Link>
      <div>
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="text-sm text-neutral-600">{t.intro}</p>
      </div>
      <RoleMatrix action={saveRoleMatrix} roles={columns} groups={permissionGroups()} />
      <section className="flex flex-col gap-2 rounded-xl border border-dashed border-neutral-300 bg-white p-4">
        <h2 className="font-semibold">{t.newRole}</h2>
        <NewRoleForm action={createRole} />
      </section>
    </div>
  );
}
