import Link from "next/link";
import { listApiCalls, listApiKeys } from "@/lib/data/api-keys";
import { listDelayCodes } from "@/lib/data/delays";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canManageMessaging } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { formatDateTime } from "@/lib/time";
import { createDelayCode, createKey, revokeKey, updateDelayCode } from "./actions";
import { ApiKeyForm, DelayCodeForm, RevokeKeyButton } from "./forms";

const t = messages.messaging;

export default async function MessagingSettingsPage() {
  await requireCapability(canManageMessaging);
  const [keys, calls, delayCodes] = await Promise.all([listApiKeys(), listApiCalls(), listDelayCodes()]);
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
        <h2 className="font-semibold">{messages.delayCodes.title}</h2>
        <p className="max-w-3xl text-sm text-neutral-600">{messages.delayCodes.hint}</p>
        <DelayCodeForm
          action={createDelayCode}
          initial={{ code: "", description: "", active: "on" }}
          submitLabel={messages.delayCodes.create}
        />
        {delayCodes.length === 0 ? (
          <p className="text-sm text-neutral-600">{messages.delayCodes.empty}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100">
            {delayCodes.map((code) => (
              <li key={code.id} className="py-2">
                <DelayCodeForm
                  action={updateDelayCode.bind(null, code.id)}
                  initial={{ code: code.code, description: code.description ?? "", active: code.active ? "on" : "" }}
                  submitLabel={messages.delayCodes.save}
                />
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-neutral-500">{messages.delayCodes.noDelete}</p>
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
