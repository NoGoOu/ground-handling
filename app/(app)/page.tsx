import { redirect } from "next/navigation";
import { messages } from "@/lib/messages";
import { homePathFor } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export default async function HomePage() {
  const user = await requireUser();
  const home = homePathFor(user);
  if (home !== "/") redirect(home);

  // A user without any permission has no page to land on.
  return (
    <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-600">
      {messages.home.noAccess}
    </p>
  );
}
