import type { ReactNode } from "react";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { warningText } from "@/lib/telex/describe";
import type { Infographic, InfographicSource } from "@/lib/telex/infographic";
import { formatDateTime } from "@/lib/time";

// The infographic of a flight part (CLAUDE.md, 7. mérföldkő), in a fixed
// layout that reads well on a phone: one column there, more on a wider screen.

const t = messages.infographic;
const kg = (value: number) => fmt(t.kg, { kg: value.toLocaleString("hu-HU") });

function Card({ title, sources, children, wide }: { title: string; sources: InfographicSource[]; children: ReactNode; wide?: boolean }) {
  return (
    <section className={`flex flex-col gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 ${wide ? "sm:col-span-2" : ""}`}>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">{title}</h3>
      <div className="flex flex-col gap-1 text-sm">{children}</div>
      {sources.map((source) => (
        <p key={source.messageId} className="text-xs text-neutral-500">
          {fmt(t.source, { type: source.type, time: formatDateTime(source.receivedAt) })}
        </p>
      ))}
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

export function InfographicView({ data }: { data: Infographic }) {
  const { passengers, load, ulds, stacks, specialCodes, weights, warnings } = data;
  if (!passengers && !load && !ulds && !stacks && !specialCodes && !weights && warnings.length === 0) {
    return <p className="text-sm text-neutral-600">{t.empty}</p>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
              {load.byCategory
                .map((c) => `${categoryLabel(c.key)} ${c.key === "BP" ? fmt(t.pieces, { count: c.value }) : kg(c.value)}`)
                .join(", ")}
            </p>
          )}
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

      {weights && (
        <Card title={t.weights} sources={[weights.source]}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            {weights.values.map((w) => (
              <div key={w.name} className="contents">
                <dt className="text-neutral-500">{w.name}</dt>
                <dd className="tabular-nums">{w.value.toLocaleString("hu-HU")}</dd>
              </div>
            ))}
          </dl>
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
                  <th className="pr-3 text-right font-normal">{t.weight}</th>
                  <th className="pr-3 font-normal">{t.category}</th>
                  <th className="pr-3 font-normal">{t.codes}</th>
                  <th className="font-normal">{t.destination}</th>
                </tr>
              </thead>
              <tbody>
                {ulds.positions.map((p) => (
                  <tr key={p.position} className="border-t border-neutral-200">
                    <td className="pr-3 font-mono">{p.position}</td>
                    <td className="pr-3 font-mono">{p.uld ?? "–"}</td>
                    <td className="pr-3 text-right tabular-nums">{p.weight?.toLocaleString("hu-HU") ?? "–"}</td>
                    <td className="pr-3" title={p.category ? categoryLabel(p.category) : undefined}>
                      {p.category ?? "–"}
                    </td>
                    <td className="pr-3 font-mono">{p.codes.join(" ")}</td>
                    <td className="font-mono">{p.destination ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
