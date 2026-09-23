import { listRoles, listTeams } from "@/lib/data/users";
import { messages } from "@/lib/messages";
import { canManageUsers } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { createUser } from "../actions";
import { UserForm } from "../user-form";

export default async function NewUserPage() {
  await requireCapability(canManageUsers);
  const [roles, teams] = await Promise.all([listRoles(), listTeams()]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{messages.userForm.newTitle}</h1>
      <UserForm
        action={createUser}
        isNew
        roles={roles.map((role) => ({ id: role.id, name: role.name }))}
        teams={teams.map((team) => ({ id: team.id, name: team.name }))}
        initial={{ name: "", username: "", password: "", active: "on", teamId: "", roleIds: [] }}
      />
    </div>
  );
}
