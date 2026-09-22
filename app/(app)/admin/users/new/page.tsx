import { messages } from "@/lib/messages";
import { canAdminister } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { createUser } from "../actions";
import { UserForm } from "../user-form";

export default async function NewUserPage() {
  await requireCapability(canAdminister);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{messages.userForm.newTitle}</h1>
      <UserForm
        action={createUser}
        isNew
        initial={{ name: "", username: "", role: "AGENT", password: "", active: "on" }}
      />
    </div>
  );
}
