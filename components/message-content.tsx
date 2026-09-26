import type { ReactNode } from "react";
import type { FlightMessage } from "@/lib/data/messages";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { formatDateTime } from "@/lib/time";

// The parsed content of a message, in short (7. mérföldkő, "Üzenetek" fül).
// Times are shown in local time; the raw text keeps them in UTC.

const t = messages.flightMessages;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-neutral-500">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

const time = (iso: string | undefined) => (iso ? formatDateTime(new Date(iso)) : null);

export function MessageContent({ message }: { message: FlightMessage }) {
  const parsed = message.parsedMessage;
  const times = message.stored.times ?? {};
  const rows: ReactNode[] = [];
  if (parsed.header?.registration) rows.push(<Row key="reg" label={t.fields.registration}>{parsed.header.registration}</Row>);

  if (parsed.type === "MVT") {
    const { data } = parsed;
    const entries: [string, string | undefined][] = [
      [t.fields.offBlock, times.offBlock],
      [t.fields.airborne, times.airborne],
      [t.fields.touchdown, times.touchdown],
      [t.fields.onBlock, times.onBlock],
    ];
    for (const [label, iso] of entries) if (iso) rows.push(<Row key={label} label={label}>{time(iso)}</Row>);
    if (data.estimatedArrival) {
      rows.push(
        <Row key="ea" label={t.fields.estimatedArrival}>
          {time(times.estimatedArrival) ?? "–"} {data.estimatedArrival.destination}
        </Row>,
      );
    }
    if (data.delays.length > 0) {
      rows.push(
        <Row key="dl" label={t.fields.delays}>
          {data.delays
            .map((d) =>
              d.minutes === null ? fmt(t.values.delayNoMinutes, { code: d.code }) : fmt(t.values.delay, { code: d.code, minutes: d.minutes }),
            )
            .join(", ")}
        </Row>,
      );
    }
    if (data.si.length > 0) rows.push(<Row key="si" label={t.fields.si}>{data.si.join(" ")}</Row>);
  }

  if (parsed.type === "LDM") {
    const { data } = parsed;
    if (data.configuration) rows.push(<Row key="cfg" label={t.fields.configuration}>{data.configuration}</Row>);
    if (data.crew) rows.push(<Row key="crew" label={t.fields.crew}>{fmt(t.values.crew, data.crew)}</Row>);
    for (const leg of data.legs) {
      const load = [
        leg.totalLoad !== null ? fmt(t.values.load, { total: leg.totalLoad }) : null,
        leg.mainDeck !== null ? fmt(t.values.mainDeck, { kg: leg.mainDeck }) : null,
        ...leg.holds.map((h) => fmt(t.values.hold, { hold: h.hold, kg: h.weight })),
      ].filter(Boolean);
      if (leg.passengers) {
        rows.push(
          <Row key={`pax-${leg.destination}`} label={t.fields.passengers}>
            {fmt(t.values.destination, { destination: leg.destination, text: fmt(t.values.passengers, leg.passengers) })}
          </Row>,
        );
      }
      rows.push(
        <Row key={`load-${leg.destination}`} label={t.fields.load}>
          {fmt(t.values.destination, { destination: leg.destination, text: load.join(", ") || "–" })}
        </Row>,
      );
    }
    if (data.specialItems.length > 0) {
      rows.push(
        <Row key="special" label={t.fields.specialItems}>
          {data.specialItems.map((i) => `${i.code} ${i.position} ${i.weight} kg`).join(", ")}
        </Row>,
      );
    }
    if (data.si.length > 0) rows.push(<Row key="si" label={t.fields.si}>{data.si.map((s) => s.text).join(" · ")}</Row>);
  }

  if (parsed.type === "CPM") {
    const { data } = parsed;
    if (data.from || data.to) rows.push(<Row key="route" label={t.fields.route}>{[data.from, data.to].filter(Boolean).join(" → ")}</Row>);
    if (data.totalWeight !== null) rows.push(<Row key="total" label={t.fields.totalWeight}>{fmt(t.values.kg, { kg: data.totalWeight })}</Row>);
    rows.push(
      <Row key="positions" label={t.fields.positions}>
        {fmt(t.values.positions, { used: data.positions.filter((p) => !p.empty).length, count: data.positions.length })}
      </Row>,
    );
  }

  if (parsed.type === "UCM") {
    const { data } = parsed;
    if (data.direction) rows.push(<Row key="dir" label={t.fields.direction}>{t.kinds[data.direction]}</Row>);
    rows.push(
      <Row key="ulds" label={t.fields.ulds}>
        {fmt(t.values.ulds, { count: data.items.length })}: {data.items.map((i) => `${i.uld}/${i.category ?? "–"}`).join(", ")}
      </Row>,
    );
  }

  return rows.length > 0 ? <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">{rows}</dl> : null;
}
