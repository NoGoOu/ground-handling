import Link from "next/link";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { formatSize, latestBackupState } from "@/lib/ops/backups";
import { backupSizes, watchedDisks } from "@/lib/ops/disk";
import { appVersion, formatVersion } from "@/lib/ops/version";
import { canManageMessaging, canManageSettings, canOpenAdmin } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { formatDateTime } from "@/lib/time";

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
  // Operating the server (13. mérföldkő): the running version and the latest backup.
  const ops = canManageSettings(user);
  const [backup, disks, sizes] = ops ? await Promise.all([latestBackupState(), watchedDisks(), backupSizes()]) : [null, [], null];
  const o = messages.ops.adminPage;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{messages.pages.admin}</h1>
      {backup && (
        <section className="flex flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-4 text-sm">
          <h2 className="text-base font-semibold">{o.title}</h2>
          <p className="text-neutral-700">{fmt(o.version, { version: formatVersion(appVersion()) })}</p>
          {backup.kind === "unconfigured" && <p className="text-neutral-600">{o.backupUnconfigured}</p>}
          {backup.kind === "none" && <p className="font-medium text-red-700">{o.backupNone}</p>}
          {(backup.kind === "ok" || backup.kind === "old") && (
            <p className={backup.kind === "old" ? "font-medium text-red-700" : "text-neutral-700"}>
              {fmt(backup.kind === "old" ? o.backupOld : o.backupOk, {
                time: formatDateTime(backup.at),
                name: backup.name,
                size: formatSize(backup.bytes),
              })}
            </p>
          )}
          {sizes && (
            <p className="text-neutral-700">
              {fmt(o.backupSizes, { total: formatSize(sizes.packages + sizes.files), db: formatSize(sizes.packages), files: formatSize(sizes.files) })}
            </p>
          )}
          {disks.map(({ label, usage }) => (
            <p key={label} className={usage.warning ? "font-medium text-red-700" : "text-neutral-700"}>
              {fmt(usage.warning ? o.diskWarning : o.disk, {
                disk: o.diskLabels[label],
                used: usage.usedPercent,
                free: formatSize(usage.freeBytes),
                total: formatSize(usage.totalBytes),
              })}
            </p>
          ))}
        </section>
      )}
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
