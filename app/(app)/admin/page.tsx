import Link from "next/link";
import { messages } from "@/lib/messages";
import { canManageMessaging, canOpenAdmin } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";

const t = messages.admin;

export default async function AdminPage() {
  const user = await requireCapability(canOpenAdmin);
  const sections = [
    { href: "/admin/users", title: t.users, hint: t.usersHint },
    { href: "/admin/roles", title: t.roles, hint: t.rolesHint },
    { href: "/admin/teams", title: t.teams, hint: t.teamsHint },
    { href: "/admin/airlines", title: t.airlines, hint: t.airlinesHint },
    { href: "/admin/task-types", title: messages.taskTypes.title, hint: messages.taskTypes.hint },
    { href: "/admin/settings", title: t.settings, hint: t.settingsHint },
    ...(canManageMessaging(user) ? [{ href: "/admin/messaging", title: t.messaging, hint: t.messagingHint }] : []),
  ];
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{messages.pages.admin}</h1>
      <ul className="grid gap-3 sm:grid-cols-2">
        {sections.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="flex h-full flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-4 hover:border-sky-300 hover:bg-sky-50"
            >
              <span className="text-lg font-semibold">{s.title}</span>
              <span className="text-sm text-neutral-600">{s.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
