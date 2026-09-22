import { messages } from "@/lib/messages";
import { requireUser } from "@/lib/session";

export default async function HomePage() {
  const user = await requireUser();
  return (
    <p className="text-lg">
      {messages.home.signedInAs} <strong>{user.name}</strong> ({messages.roles[user.role]})
    </p>
  );
}
