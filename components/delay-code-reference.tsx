import type { DelayCodeReference as Reference } from "@/lib/data/delay-documents";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";

// "Késéskódok" on a flight (CLAUDE.md, 8. mérföldkő, utómunka): the airline's
// own document opens in a new tab; without one the common table opens in
// place, so that a half-filled form is not lost.

const t = messages.delayReference;

export function DelayCodeReference({
  flightId,
  airlineName,
  reference,
}: {
  flightId: string;
  airlineName: string;
  reference: Reference;
}) {
  if (reference.document) {
    return (
      <a
        href={`/api/flights/${flightId}/delay-codes`}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start text-sm text-sky-700 hover:underline"
      >
        {fmt(t.document, { airline: airlineName })}
      </a>
    );
  }
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-sky-700 hover:underline">{t.table}</summary>
      <div className="mt-2 flex flex-col gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <p className="text-xs text-neutral-500">{t.tableNote}</p>
        {reference.codes.length === 0 ? (
          <p className="text-neutral-600">{t.empty}</p>
        ) : (
          <table className="w-full text-left">
            <thead className="text-xs text-neutral-500">
              <tr>
                <th className="w-16 pr-3 font-normal">{t.code}</th>
                <th className="font-normal">{t.description}</th>
              </tr>
            </thead>
            <tbody>
              {reference.codes.map((code) => (
                <tr key={code.code} className="border-t border-neutral-200 align-top">
                  <td className="pr-3 font-mono font-semibold">{code.code}</td>
                  <td className={code.description ? "" : "text-neutral-400"}>{code.description ?? t.noDescription}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </details>
  );
}
