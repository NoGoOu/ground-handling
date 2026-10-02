"use client";

import { useActionState, useState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import type { FeedResult } from "./actions";

const c = messages.calendar;

/** The new link, shown once, with a copy button. */
function NewLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
      <p className="text-sm font-medium text-emerald-900">{c.newLink}</p>
      <input
        readOnly
        value={url}
        aria-label={c.subscribeTitle}
        className="input font-mono text-xs"
        onFocus={(event) => event.currentTarget.select()}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {c.copy}
        </button>
        {copied && (
          <span role="status" className="text-sm text-emerald-800">
            {c.copied}
          </span>
        )}
      </div>
    </div>
  );
}

export function CalendarPanel({
  configured,
  feed,
  createAction,
  revokeAction,
}: {
  configured: boolean;
  /** The live link's times, already formatted; null when there is none. */
  feed: { created: string; used: string | null } | null;
  createAction: (state: FeedResult | null) => Promise<FeedResult>;
  revokeAction: () => Promise<ActionResult>;
}) {
  const [created, create, creating] = useActionState(createAction, null);
  const [revoked, revoke, revoking] = useActionState(revokeAction, null);

  if (!configured) return <p className="text-sm text-neutral-600">{c.notConfigured}</p>;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-neutral-700">
        {feed ? fmt(c.feedActive, { created: feed.created, used: feed.used ?? c.neverUsed }) : c.noFeed}
      </p>
      {created?.ok && feed && <NewLink url={created.url} />}
      {created && !created.ok && <ActionFeedback result={created} />}
      <div className="flex flex-wrap gap-2">
        <form action={create}>
          <button
            type="submit"
            disabled={creating}
            className="btn btn-primary btn-lg"
            onClick={(event) => {
              if (feed && !window.confirm(c.confirmRegenerate)) event.preventDefault();
            }}
          >
            {feed ? c.regenerate : c.create}
          </button>
        </form>
        {feed && (
          <form action={revoke}>
            <button
              type="submit"
              disabled={revoking}
              className="btn btn-secondary btn-lg"
              onClick={(event) => {
                if (!window.confirm(c.confirmRevoke)) event.preventDefault();
              }}
            >
              {c.revoke}
            </button>
          </form>
        )}
      </div>
      {!feed && revoked?.ok && (
        <p role="status" className="text-sm text-emerald-700">
          {c.revoked}
        </p>
      )}
      <ul className="list-disc pl-5 text-sm text-neutral-600">
        {c.howTo.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="text-sm text-amber-900">{c.secret}</p>
    </div>
  );
}
