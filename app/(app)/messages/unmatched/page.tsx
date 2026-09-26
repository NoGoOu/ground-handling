import Link from "next/link";
import { listUnmatched } from "@/lib/data/messages";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canRecordMessages } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { unmatchedText, warningText } from "@/lib/telex/describe";
import { formatDateTime } from "@/lib/time";
import { assignUnmatched, discardUnmatched } from "../actions";
import { AssignForm, DiscardButton } from "../forms";

const t = messages.inbox;

export default async function UnmatchedMessagesPage(props: PageProps<"/messages/unmatched">) {
  await requireCapability(canRecordMessages);
  const discarded = (await props.searchParams).discarded === "1";
  const rows = await listUnmatched(discarded);
  return (
    <div className="flex flex-col gap-4">
      <Link href="/messages" className="self-start text-sm text-sky-700 hover:underline">
        {messages.admin.back}
      </Link>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">{t.unmatched.title}</h1>
        <Link href={discarded ? "/messages/unmatched" : "/messages/unmatched?discarded=1"} className="text-sm text-sky-700 hover:underline">
          {discarded ? t.unmatched.hideDiscarded : t.unmatched.showDiscarded}
        </Link>
      </div>
      <p className="max-w-3xl text-sm text-neutral-600">{t.unmatched.hint}</p>

      {rows.length === 0 ? (
        <p className="text-neutral-600">{t.unmatched.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const source =
              row.source === "API"
                ? fmt(t.source.API, { key: row.apiKey?.name ?? "–" })
                : row.source === "MANUAL"
                  ? fmt(t.source.MANUAL, { name: row.createdBy?.name ?? "–" })
                  : t.source.GENERATED;
            return (
              <li key={row.id} className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-sm">
                <span>
                  <span className="font-mono font-semibold">{row.type}</span>{" "}
                  <span className="font-mono">
                    {row.flightNumber ?? "–"}/{row.headerDate ?? "–"}
                  </span>
                  <span className="text-neutral-500">
                    {" "}
                    · {fmt(t.unmatched.received, { time: formatDateTime(row.receivedAt) })} · {source}
                  </span>
                </span>
                {row.unmatchedReason && (
                  <span className="text-orange-800">{fmt(t.unmatched.reason, { reason: unmatchedText(row.unmatchedReason) })}</span>
                )}
                {row.warnings.map((warning, i) => (
                  <span key={i} className="text-orange-700">
                    ⚠ {warningText(warning)}
                  </span>
                ))}
                <details>
                  <summary className="cursor-pointer text-neutral-600">{t.unmatched.raw}</summary>
                  <pre className="mt-1 overflow-x-auto rounded bg-neutral-50 p-2 font-mono text-xs">
                    {row.envelope ? `${row.envelope}\n${row.rawText}` : row.rawText}
                  </pre>
                </details>
                {row.discardedAt ? (
                  <span className="text-neutral-500">
                    {fmt(t.unmatched.discardedBy, { name: row.discardedBy?.name ?? "–", time: formatDateTime(row.discardedAt) })}
                  </span>
                ) : (
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    {row.candidates.length === 0 ? (
                      <span className="text-neutral-600">{t.unmatched.noCandidates}</span>
                    ) : (
                      <AssignForm
                        action={assignUnmatched.bind(null, row.id)}
                        options={row.candidates.map((c) => ({
                          value: `${c.flightId}|${c.part}`,
                          label: fmt(t.unmatched.candidate, {
                            flight: c.flightNumber,
                            part: messages.part[c.part],
                            day: c.operatingDay,
                          }),
                        }))}
                      />
                    )}
                    <DiscardButton action={discardUnmatched.bind(null, row.id)} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
