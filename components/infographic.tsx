import type { ReactNode } from "react";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { warningText } from "@/lib/telex/describe";
import type { Infographic, InfographicSource } from "@/lib/telex/infographic";
import { siLines, type SiLineKind } from "@/lib/telex/si";
import { formatDateTime, formatTime } from "@/lib/time";

// The infographic of a flight part (CLAUDE.md, 7. and 8. mérföldkő), in a
// fixed layout that reads well on a phone: one column there, more on a wider
// screen. On top the SI of the latest LDM and CPM as it came, so that a framed
// operating instruction and a DAA are seen first.

const t = messages.infographic;
const kg = (value: number) => fmt(t.kg, { kg: value.toLocaleString("hu-HU") });

function Sources({ sources }: { sources: InfographicSource[] }) {
  return sources.map((source) => (
    <p key={source.messageId} className="text-xs text-neutral-500">
      {fmt(t.source, { type: source.type, time: formatDateTime(source.receivedAt) })}
    </p>
  ));
}

function Card({ title, sources, children, wide }: { title: string; sources: InfographicSource[]; children: ReactNode; wide?: boolean }) {
  return (
    <section className={`flex flex-col gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 ${wide ? "sm:col-span-2" : ""}`}>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">{title}</h3>
      <div className="flex flex-col gap-1 text-sm">{children}</div>
      <Sources sources={sources} />
    </section>
  );
}

function Figure({ value, label }: { value: string | number; label: string }) {
  return (
    <span className="flex flex-col items-center">
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-xs text-neutral-500">{label}</span>
    </span>
  );
}

const categoryLabel = (key: string) => (t.categories as Record<string, string>)[key] ?? key;
const classLabel = (cls: string) => (t.classes as Record<string, string>)[cls] ?? cls;

/**
 * The SI as it came. The lines between rows of asterisks are an operating
 * instruction and a DAA line is for the arrival agent: both stand out.
 */
function SiText({ text }: { text: string }) {
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm leading-snug">
      {siLines(text).map(({ line, kind }, i) => (
        <span key={i} className={SI_LINE_STYLE[kind]}>
          {line || " "}
        </span>
      ))}
    </pre>
  );
}

const SI_LINE_STYLE: Record<SiLineKind, string> = {
  frame: "block text-red-700",
  instruction: "block font-bold text-red-800",
  daa: "block font-semibold text-sky-900",
  plain: "block",
};


export function InfographicView({ data }: { data: Infographic }) {
  const { si, passengers, load, ulds, stacks, specialCodes, specialNeeds, transfers, slot, warnings } = data;
  const empty =
    si.length === 0 && !passengers && !load && !ulds && !stacks && !specialCodes && !specialNeeds && !transfers && !slot && warnings.length === 0;
  if (empty) return <p className="text-sm text-neutral-600">{t.empty}</p>;
  return (
    <div className="flex flex-col gap-3">
      {si.map((block) => (
        <section key={block.source.messageId} className="flex flex-col gap-1 rounded-lg border-2 border-amber-400 bg-amber-50 p-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-900">{fmt(t.siTitle, { type: block.type })}</h3>
          <SiText text={block.text} />
          <Sources sources={[block.source]} />
        </section>
      ))}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {slot && (
          <Card title={t.slotTitle} sources={[slot.source]}>
            <p className="text-lg font-bold tabular-nums">{fmt(messages.slot.badge, { time: formatTime(slot.ctot) })}</p>
            <p>{fmt(t.slotTarget, { time: formatTime(slot.targetOffBlock), taxi: slot.taxiMinutes })}</p>
            {slot.regulations.length > 0 && <p className="text-neutral-600">{fmt(messages.slot.regulations, { list: slot.regulations.join(", ") })}</p>}
            {slot.cause && <p className="text-neutral-600">{fmt(messages.slot.cause, { reason: slot.cause.reason, code: slot.cause.delayCode ?? "–" })}</p>}
          </Card>
        )}

        {passengers && (
          <Card title={t.passengers} sources={[passengers.source]}>
            <div className="flex flex-wrap justify-between gap-2">
              <Figure value={passengers.male} label={t.male} />
              <Figure value={passengers.female} label={t.female} />
              <Figure value={passengers.child} label={t.child} />
              <Figure value={passengers.infant} label={t.infant} />
              <Figure value={passengers.total} label={t.total} />
            </div>
          </Card>
        )}

        {specialNeeds && (
          <Card title={t.specialNeeds} sources={specialNeeds.sources}>
            <ul className="flex flex-col gap-0.5">
              {specialNeeds.codes.map((c) => (
                <li key={c.code}>
                  <span className="font-mono font-semibold">{c.code}</span>:{" "}
                  {c.byClass.length > 0 ? c.byClass.map((x) => `${x.count} ${classLabel(x.cls)}`).join(", ") : "0"}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {load && (
          <Card title={t.load} sources={[load.source]}>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
              {load.total !== null && (
                <>
                  <dt className="font-medium">{t.totalLoad}</dt>
                  <dd className="font-semibold tabular-nums">{kg(load.total)}</dd>
                </>
              )}
              {load.mainDeck !== null && (
                <>
                  <dt className="text-neutral-500">{t.mainDeck}</dt>
                  <dd className="tabular-nums">{kg(load.mainDeck)}</dd>
                </>
              )}
              {load.holds.map((h) => (
                <div key={h.hold} className="contents">
                  <dt className="text-neutral-500">{fmt(t.hold, { hold: h.hold })}</dt>
                  <dd className="tabular-nums">{kg(h.weight)}</dd>
                </div>
              ))}
              {load.bulk !== null && (
                <>
                  <dt className="text-neutral-500">{t.bulk}</dt>
                  <dd className="tabular-nums">{kg(load.bulk)}</dd>
                </>
              )}
            </dl>
            {load.byCategory.length > 0 && (
              <p className="text-neutral-700">
                <span className="text-neutral-500">{t.byCategory}: </span>
                {load.byCategory.map((c) => `${categoryLabel(c.key)} ${kg(c.value)}`).join(", ")}
              </p>
            )}
            {load.crewBags !== null && <p className="text-neutral-600">{fmt(t.crewBags, { kg: load.crewBags })}</p>}
          </Card>
        )}

        {specialCodes && (
          <Card title={t.specialCodes} sources={[specialCodes.source]}>
            <ul className="flex flex-wrap gap-2">
              {specialCodes.codes.map((c) => (
                <li key={c.code} className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1">
                  <span className="font-mono font-semibold">{c.code}</span>{" "}
                  <span className="text-neutral-600">{c.positions.join(", ")}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {stacks && (
          <Card title={t.stacks} sources={stacks.sources}>
            {stacks.positions.map((p) => (
              <p key={p.position} className="tabular-nums">
                {fmt(t.stackRow, { position: p.position, uld: p.uld ?? "–", kg: p.weight ?? "–" })}
              </p>
            ))}
            {stacks.ucm && <p className="text-neutral-600">{fmt(t.ucmCounts, stacks.ucm)}</p>}
          </Card>
        )}

        {transfers && (
          <Card title={t.transfers} sources={transfers.sources} wide>
            <ul className="flex flex-col gap-0.5">
              {transfers.rows.map((r) => (
                <li key={`${r.flight}-${r.destination}-${r.cls}`} className="tabular-nums">
                  {fmt(t.transferRow, { flight: r.flight, destination: r.destination, pax: r.pax, cls: classLabel(r.cls), bags: r.bags, kg: r.weight })}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {warnings.length > 0 && (
          <Card title={t.warnings} sources={[]}>
            {warnings.map((w, i) => (
              <p key={i} className="text-orange-700">
                ⚠ {warningText(w)}
              </p>
            ))}
          </Card>
        )}

        {ulds && (
          <Card title={t.ulds} sources={[ulds.source]} wide>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-neutral-500">
                  <tr>
                    <th className="pr-3 font-normal">{t.position}</th>
                    <th className="pr-3 font-normal">{t.uld}</th>
                    <th className="pr-3 font-normal">{t.items}</th>
                    <th className="pr-3 text-right font-normal">{t.weight}</th>
                    <th className="pr-3 font-normal">{t.free}</th>
                    <th className="pr-3 font-normal">{t.codes}</th>
                    <th className="font-normal">{t.destination}</th>
                  </tr>
                </thead>
                <tbody>
                  {ulds.positions.map((p) => (
                    <tr key={p.position} className={`border-t border-neutral-200 ${p.urgent ? "bg-red-50 font-semibold text-red-900" : ""}`}>
                      <td className="pr-3 font-mono">{p.position}</td>
                      <td className="pr-3 font-mono">{p.uld ?? "–"}</td>
                      <td className="pr-3">
                        {p.items.length > 0
                          ? p.items.map((item) => `${item.category ?? "–"} ${item.weight ?? "–"}`).join(" · ")
                          : "–"}
                        {p.urgent && <span className="ml-1 rounded bg-red-200 px-1 text-xs">{t.urgent}</span>}
                      </td>
                      <td className="pr-3 text-right tabular-nums">{p.weight?.toLocaleString("hu-HU") ?? "–"}</td>
                      <td className="pr-3 tabular-nums">{p.freeQuarters !== null ? fmt(t.freeQuarters, { n: p.freeQuarters }) : "–"}</td>
                      <td className="pr-3 font-mono">{p.codes.join(" ")}</td>
                      <td className="font-mono">{p.destination ?? "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-neutral-500">{t.itemsHint}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
