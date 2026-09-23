import Link from "next/link";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { canManageUsers } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";

const t = messages.userForm;

export default async function UsersPage() {
  await requireCapability(canManageUsers);
  const users = await prisma.user.findMany({
    include: { roles: { include: { role: { select: { name: true } } } }, team: { select: { name: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin" className="self-start text-sm text-sky-700 hover:underline">
        {messages.admin.back}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{messages.admin.users}</h1>
        <Link href="/admin/users/new" className="btn btn-primary">
          {t.newUser}
        </Link>
      </div>
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-600 uppercase">
            <tr>
              <th className="px-3 py-2">{t.columns.name}</th>
              <th className="px-3 py-2">{t.columns.username}</th>
              <th className="px-3 py-2">{t.columns.roles}</th>
              <th className="px-3 py-2">{t.columns.team}</th>
              <th className="px-3 py-2">{t.columns.status}</th>
              <th className="px-3 py-2">
                <span className="sr-only">{messages.admin.edit}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {users.map((user) => (
              <tr key={user.id} className={user.active ? "" : "text-neutral-400"}>
                <td className="px-3 py-2 font-medium">{user.name}</td>
                <td className="px-3 py-2">{user.username}</td>
                <td className="px-3 py-2">
                  {user.roles.map((entry) => entry.role.name).join(", ") || <span className="text-neutral-400">–</span>}
                </td>
                <td className="px-3 py-2">{user.team?.name ?? <span className="text-neutral-400">–</span>}</td>
                <td className="px-3 py-2">{user.active ? messages.admin.active : messages.admin.inactive}</td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/admin/users/${user.id}`} className="text-sky-700 hover:underline">
                    {messages.admin.edit}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
