import { notFound } from "next/navigation";
import { listRoles } from "@/lib/data/users";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { canManageUsers } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { updateUser } from "../actions";
import { UserForm } from "../user-form";

export default async function EditUserPage(props: PageProps<"/admin/users/[id]">) {
  await requireCapability(canManageUsers);
  const { id } = await props.params;
  const [user, roles] = await Promise.all([
    prisma.user.findUnique({ where: { id }, include: { roles: true } }),
    listRoles(),
  ]);
  if (!user) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">
        {messages.userForm.editTitle}: {user.name}
      </h1>
      <UserForm
        action={updateUser.bind(null, user.id)}
        isNew={false}
        roles={roles.map((role) => ({ id: role.id, name: role.name }))}
        initial={{
          name: user.name,
          username: user.username,
          password: "",
          active: user.active ? "on" : "",
          roleIds: user.roles.map((entry) => entry.roleId),
        }}
      />
    </div>
  );
}
