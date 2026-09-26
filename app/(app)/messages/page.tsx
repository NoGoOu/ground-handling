import Link from "next/link";
import { countUnmatched } from "@/lib/data/messages";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canRecordMessages } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { pasteMessages } from "./actions";
import { PasteForm } from "./forms";

const t = messages.inbox;

export default async function MessagesPage() {
  await requireCapability(canRecordMessages);
  const unmatched = await countUnmatched();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <Link href="/messages/unmatched" className="text-sm text-sky-700 hover:underline">
          {fmt(t.unmatchedLink, { count: unmatched })}
        </Link>
      </div>
      <section className="flex max-w-3xl flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{t.pasteTitle}</h2>
        <p className="text-sm text-neutral-600">{t.pasteHint}</p>
        <PasteForm action={pasteMessages} />
      </section>
    </div>
  );
}
