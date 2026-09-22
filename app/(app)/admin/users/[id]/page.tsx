import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { canAdminister } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { updateUser } from "../actions";
import { UserForm } from "../user-form";

export default async function EditUserPage(props: PageProps<"/admin/users/[id]">) {
  await requireCapability(canAdminister);
  const { id } = await props.params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">
        {messages.userForm.editTitle}: {user.name}
      </h1>
      <UserForm
        action={updateUser.bind(null, user.id)}
        isNew={false}
        initial={{
          name: user.name,
          username: user.username,
          role: user.role,
          password: "",
          active: user.active ? "on" : "",
        }}
      />
    </div>
  );
}
