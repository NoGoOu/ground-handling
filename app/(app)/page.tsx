import { redirect } from "next/navigation";
import { homePathFor } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export default async function HomePage() {
  const user = await requireUser();
  redirect(homePathFor(user.role));
}
