import Link from "next/link";
import { logout } from "@/app/(app)/actions";
import { NavLinks, type NavLink } from "@/components/nav-links";
import { countOpenFaults } from "@/lib/data/faults";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import {
  canImportSchedule,
  canManageFaults,
  canManageFlights,
  canOpenAdmin,
  canOpenFaults,
  canOpenTrainingArea,
  canRecordMessages,
  canViewBoard,
  canViewEquipment,
  canViewOwnTasks,
  canViewPlans,
  canViewRoster,
  canViewStaffing,
} from "@/lib/permissions";
import type { CurrentUser } from "@/lib/session";

function linksFor(user: CurrentUser, openFaults: number) {
  const links: NavLink[] = [];
  if (canManageFlights(user)) links.push({ href: "/flights", label: messages.nav.flights });
  if (canViewBoard(user)) links.push({ href: "/board", label: messages.nav.board });
  if (canViewRoster(user)) links.push({ href: "/shifts", label: messages.nav.shifts });
  if (canImportSchedule(user)) links.push({ href: "/import", label: messages.nav.import });
  if (canViewPlans(user)) links.push({ href: "/planning", label: messages.nav.planning });
  if (canViewStaffing(user)) links.push({ href: "/staffing", label: messages.nav.staffing });
  if (canOpenTrainingArea(user)) links.push({ href: "/training", label: messages.nav.training });
  if (canRecordMessages(user)) links.push({ href: "/messages", label: messages.nav.messages });
  // Ground equipment (11. mérföldkő).
  if (canViewEquipment(user)) links.push({ href: "/equipment", label: messages.nav.equipment });
  if (canOpenFaults(user)) {
    // The technical staff see the open faults in the menu (11. mérföldkő, "Jelzés").
    const badge = canManageFaults(user) ? { count: openFaults, title: fmt(messages.nav.openFaults, { n: openFaults }) } : undefined;
    links.push({ href: "/faults", label: messages.nav.faults, badge });
  }
  // "My tasks" is the agents' view; agents are the users who belong to a team.
  if (user.teamId && canViewOwnTasks(user)) links.push({ href: "/agent", label: messages.nav.myTasks });
  if (canOpenAdmin(user)) links.push({ href: "/admin", label: messages.nav.admin });
  return links;
}

export async function AppHeader({ user }: { user: CurrentUser }) {
  const openFaults = canManageFaults(user) ? await countOpenFaults() : 0;
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <Link href="/" className="text-lg font-bold">
          {messages.app.name}
        </Link>
        <NavLinks links={linksFor(user, openFaults)} />
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-neutral-700">
            {user.name}{" "}
            <span className="text-neutral-500">
              ({user.roleNames.join(", ") || messages.userForm.noRole})
            </span>
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
