import Link from "next/link";
import { logout } from "@/app/(app)/actions";
import { messages } from "@/lib/messages";
import type { CurrentUser } from "@/lib/session";

export function AppHeader({ user }: { user: CurrentUser }) {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-bold">
          {messages.app.name}
        </Link>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-neutral-700">
            {user.name} <span className="text-neutral-500">({messages.roles[user.role]})</span>
          </span>
          <form action={logout}>
            <button type="submit" className="btn btn-secondary">
              {messages.nav.logout}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
