import { redirect } from "next/navigation";
import { messages } from "@/lib/messages";
import { safeCallbackPath } from "@/lib/safe-redirect";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "./login-form";

export default async function LoginPage(props: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/");
  const { callbackUrl } = await props.searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">{messages.app.name}</h1>
        <p className="mb-6 text-neutral-600">{messages.login.title}</p>
        <LoginForm callbackUrl={safeCallbackPath(callbackUrl)} />
      </div>
    </main>
  );
}
