import { notFound } from "next/navigation";
import { listRoles, listTeams } from "@/lib/data/users";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import {
  canManageUsers,
  INDIVIDUAL_SOURCE,
  isPermission,
  permissionGroups,
  PERMISSIONS,
  SCOPE_LABELS,
  type Permission,
  type Scope,
} from "@/lib/permissions";
import { loadUser, requireCapability } from "@/lib/session";
import { saveUserPermissions, updateUser } from "../actions";
import { UserPermissionsForm } from "../permissions-form";
import { UserForm } from "../user-form";

const t = messages.userPermissions;

export default async function EditUserPage(props: PageProps<"/admin/users/[id]">) {
  await requireCapability(canManageUsers);
  const { id } = await props.params;
  const [user, roles, teams, effective] = await Promise.all([
    prisma.user.findUnique({ where: { id }, include: { roles: true, permissions: true } }),
    listRoles(),
    listTeams(),
    loadUser(id),
  ]);
  if (!user) notFound();

  const individual: Partial<Record<Permission, Scope>> = Object.fromEntries(
    user.permissions
      .filter((entry) => isPermission(entry.permission))
      .map((entry) => [entry.permission as Permission, entry.scope as Scope]),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">
        {messages.userForm.editTitle}: {user.name}
      </h1>

      <UserForm
        action={updateUser.bind(null, user.id)}
        isNew={false}
        roles={roles.map((role) => ({ id: role.id, name: role.name }))}
        teams={teams.map((team) => ({ id: team.id, name: team.name }))}
        initial={{
          name: user.name,
          username: user.username,
          password: "",
          active: user.active ? "on" : "",
          teamId: user.teamId ?? "",
          roleIds: user.roles.map((entry) => entry.roleId),
        }}
      />

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="text-lg font-semibold">{t.title}</h2>
        <UserPermissionsForm
          action={saveUserPermissions.bind(null, user.id)}
          granted={individual}
          groups={permissionGroups()}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <div>
          <h2 className="text-lg font-semibold">{t.effectiveTitle}</h2>
          <p className="text-sm text-neutral-600">{t.effectiveHint}</p>
        </div>
        {!effective || effective.permissions.length === 0 ? (
          <p className="text-neutral-600">{t.none}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 text-xs text-neutral-600 uppercase">
                <tr>
                  <th className="py-2 pr-3">{messages.roleForm.permission}</th>
                  <th className="py-2 pr-3">{t.scope}</th>
                  <th className="py-2">{t.source}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {effective.permissions.map((entry) => (
                  <tr key={entry.permission}>
                    <td className="py-2 pr-3">{PERMISSIONS[entry.permission].label}</td>
                    <td className="py-2 pr-3">
                      {PERMISSIONS[entry.permission].scoped ? SCOPE_LABELS[entry.scope] : "–"}
                    </td>
                    <td className="py-2 text-neutral-600">
                      {entry.sources
                        .map((source) =>
                          PERMISSIONS[entry.permission].scoped
                            ? `${source.source} (${SCOPE_LABELS[source.scope]})`
                            : source.source,
                        )
                        .join(", ")}
                      {entry.sources.some((source) => source.source === INDIVIDUAL_SOURCE) && ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
