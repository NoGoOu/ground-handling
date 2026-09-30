import Link from "next/link";
import { listApiCalls, listApiKeys } from "@/lib/data/api-keys";
import { listAirlineDelayDocuments } from "@/lib/data/delay-documents";
import { listDelayCodes } from "@/lib/data/delays";
import { channelSetup } from "@/lib/data/outbound";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canManageMessaging } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/time";
import { ADDRESS_BOOK_TYPES } from "@/lib/validation/messaging";
import {
  addAddress,
  createAirport,
  createDelayCode,
  createKey,
  removeAddress,
  removeDelayDocumentOf,
  revokeKey,
  saveSender,
  saveSlotTolerance,
  toggleAddress,
  updateAirport,
  updateDelayCode,
  uploadDelayDocument,
} from "./actions";
import {
  AddressActions,
  AddressForm,
  AirportForm,
  ApiKeyForm,
  DelayCodeForm,
  DelayDocumentForm,
  RemoveDelayDocumentButton,
  RevokeKeyButton,
  SenderForm,
  SlotToleranceForm,
} from "./forms";

const t = messages.messaging;

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} kB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function MessagingSettingsPage() {
  await requireCapability(canManageMessaging);
  const [keys, calls, delayCodes, airlines, addresses, channels, airports, settings, delayDocuments] = await Promise.all([
    listApiKeys(),
    listApiCalls(),
    listDelayCodes(),
    prisma.airline.findMany({ select: { id: true, name: true, iataCode: true }, orderBy: { name: "asc" } }),
    prisma.addressBookEntry.findMany({
      include: { airline: { select: { name: true, iataCode: true } } },
      orderBy: [{ airline: { name: "asc" } }, { messageType: "asc" }, { address: "asc" }],
    }),
    channelSetup(),
    prisma.airport.findMany({ orderBy: { iataCode: "asc" } }),
    getSettings(),
    listAirlineDelayDocuments(),
  ]);
  const a = messages.addressBook;
  const state = (on: boolean) => (on ? a.configured : a.notConfigured);
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
        <h2 className="font-semibold">{a.senderTitle}</h2>
        <p className="max-w-3xl text-sm text-neutral-600">{a.senderHint}</p>
        <p className="text-sm">{fmt(a.channelState, { email: state(channels.setup.email), sita: state(channels.setup.sita) })}</p>
        <SenderForm
          action={saveSender}
          initial={{ senderEmail: channels.setup.senderEmail ?? "", senderTypeB: channels.setup.senderTypeB ?? "" }}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{a.title}</h2>
        <p className="max-w-3xl text-sm text-neutral-600">{a.hint}</p>
        <AddressForm
          action={addAddress}
          airlines={airlines.map((airline) => ({ id: airline.id, label: `${airline.name} (${airline.iataCode})` }))}
          types={ADDRESS_BOOK_TYPES}
        />
        {addresses.length === 0 ? (
          <p className="text-sm text-neutral-600">{a.empty}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 text-sm">
            {addresses.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                <span className={entry.active ? "" : "text-neutral-400"}>
                  <span className="font-medium">{entry.airline.iataCode}</span> · <span className="font-mono">{entry.messageType}</span> ·{" "}
                  {a.channels[entry.channel]} · <span className="font-mono">{entry.address}</span>
                  {!entry.active && <> · {a.inactive}</>}
                </span>
                <AddressActions
                  active={entry.active}
                  toggle={toggleAddress.bind(null, entry.id)}
                  remove={removeAddress.bind(null, entry.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{messages.airports.title}</h2>
        <p className="max-w-3xl text-sm text-neutral-600">{messages.airports.hint}</p>
        <AirportForm action={createAirport} initial={{ iataCode: "", icaoCode: "", name: "" }} submitLabel={messages.airports.create} />
        {airports.length === 0 ? (
          <p className="text-sm text-neutral-600">{messages.airports.empty}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100">
            {airports.map((airport) => (
              <li key={airport.id} className="py-2">
                <AirportForm
                  action={updateAirport.bind(null, airport.id)}
                  initial={{ iataCode: airport.iataCode, icaoCode: airport.icaoCode, name: airport.name }}
                  submitLabel={messages.airports.save}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{messages.slotTolerance.title}</h2>
        <p className="max-w-3xl text-sm text-neutral-600">{messages.slotTolerance.hint}</p>
        <SlotToleranceForm action={saveSlotTolerance} initial={settings.slotToleranceMinutes} />
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
        <h2 className="font-semibold">{messages.delayDocuments.title}</h2>
        <p className="max-w-3xl text-sm text-neutral-600">{messages.delayDocuments.hint}</p>
        <p className="text-xs text-neutral-500">{messages.delayDocuments.uploadHint}</p>
        <ul className="flex flex-col divide-y divide-neutral-100">
          {delayDocuments.map(({ airline, document, log }) => (
            <li key={airline.id} className="flex flex-col gap-2 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-medium">
                    {airline.name} ({airline.iataCode})
                  </span>
                  {" · "}
                  {document ? (
                    fmt(messages.delayDocuments.current, {
                      name: document.fileName,
                      size: formatSize(document.size),
                      by: document.uploadedBy,
                      at: formatDateTime(document.uploadedAt),
                    })
                  ) : (
                    <span className="text-neutral-500">{messages.delayDocuments.none}</span>
                  )}
                </span>
                {document && (
                  <span className="inline-flex items-center gap-2">
                    <a
                      href={`/api/airlines/${airline.id}/delay-codes`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-700 hover:underline"
                    >
                      {messages.delayDocuments.open}
                    </a>
                    <RemoveDelayDocumentButton action={removeDelayDocumentOf.bind(null, airline.id)} />
                  </span>
                )}
              </div>
              <DelayDocumentForm action={uploadDelayDocument.bind(null, airline.id)} hasDocument={!!document} />
              {log.length > 0 && (
                <details className="text-xs text-neutral-600">
                  <summary className="cursor-pointer">{messages.delayDocuments.log}</summary>
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {log.map((event) => (
                      <li key={event.key}>
                        {fmt(messages.delayDocuments.event, {
                          time: formatDateTime(event.at),
                          kind: messages.delayDocuments.events[event.kind],
                          name: event.fileName,
                          by: event.by,
                        })}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          ))}
        </ul>
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
