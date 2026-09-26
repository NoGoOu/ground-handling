import Link from "next/link";
import { listApiCalls, listApiKeys } from "@/lib/data/api-keys";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canManageMessaging } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { formatDateTime } from "@/lib/time";
import { createKey, revokeKey } from "./actions";
import { ApiKeyForm, RevokeKeyButton } from "./forms";

const t = messages.messaging;

export default async function MessagingSettingsPage() {
  await requireCapability(canManageMessaging);
  const [keys, calls] = await Promise.all([listApiKeys(), listApiCalls()]);
  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin" className="self-start text-sm text-sky-700 hover:underline">
        {messages.admin.back}
      </Link>
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="max-w-3xl text-sm text-neutral-600">{t.hint}</p>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{t.apiKeys.title}</h2>
        <p className="max-w-3xl text-sm text-neutral-600">{t.apiKeys.hint}</p>
        <ApiKeyForm action={createKey} />
        {keys.length === 0 ? (
          <p className="text-sm text-neutral-600">{t.apiKeys.empty}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 text-sm">
            {keys.map((key) => (
              <li key={key.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="flex flex-col gap-0.5">
                  <span>
                    <span className="font-medium">{key.name}</span>{" "}
                    <code className="font-mono text-neutral-500">{key.prefix}…</code>
                  </span>
                  <span className="text-neutral-500">
                    {fmt(t.apiKeys.createdBy, { name: key.createdBy.name, time: formatDateTime(key.createdAt) })} ·{" "}
                    {key.lastUsedAt ? fmt(t.apiKeys.lastUsed, { time: formatDateTime(key.lastUsedAt) }) : t.apiKeys.never}
                  </span>
                </span>
                {key.active ? (
                  <span className="flex items-center gap-2">
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">{t.apiKeys.active}</span>
                    <RevokeKeyButton action={revokeKey.bind(null, key.id)} />
                  </span>
                ) : (
                  <span className="text-neutral-500">
                    {fmt(t.apiKeys.revoked, { time: key.revokedAt ? formatDateTime(key.revokedAt) : "–" })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{t.calls.title}</h2>
        <p className="text-sm text-neutral-600">{t.calls.hint}</p>
        {calls.length === 0 ? (
          <p className="text-sm text-neutral-600">{t.calls.empty}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 text-sm">
            {calls.map((call) => (
              <li key={call.id} className="flex flex-wrap gap-x-3 py-1.5">
                <span className="tabular-nums text-neutral-500">{formatDateTime(call.at)}</span>
                <span className="font-medium">{call.apiKey?.name ?? t.calls.unknownKey}</span>
                <span className={call.status === 200 ? "text-emerald-700" : "text-red-700"}>{call.status}</span>
                <span className="text-neutral-700">{call.result}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
