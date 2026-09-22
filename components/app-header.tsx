import Link from "next/link";
import { logout } from "@/app/(app)/actions";
import { NavLinks } from "@/components/nav-links";
import { messages } from "@/lib/messages";
import { canAdminister, canManageFlights, canManageShifts } from "@/lib/permissions";
import type { CurrentUser } from "@/lib/session";

function linksFor(user: CurrentUser) {
  const links: { href: string; label: string }[] = [];
  if (canManageFlights(user)) links.push({ href: "/flights", label: messages.nav.flights });
  if (canManageShifts(user)) links.push({ href: "/shifts", label: messages.nav.shifts });
  if (user.role === "AGENT") links.push({ href: "/agent", label: messages.nav.myTasks });
  if (canAdminister(user)) links.push({ href: "/admin", label: messages.nav.admin });
  return links;
}

export function AppHeader({ user }: { user: CurrentUser }) {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <Link href="/" className="text-lg font-bold">
          {messages.app.name}
        </Link>
        <NavLinks links={linksFor(user)} />
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
