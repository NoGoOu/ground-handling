import { findImportRun, listImportRuns, listMissingFlights } from "@/lib/data/imports";
import { flightLabel } from "@/lib/flight";
import { importSummaryText } from "@/lib/import/describe";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canImportSchedule } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { formatDateTime } from "@/lib/time";
import { clearMissingMarker, uploadScheduleFile } from "./actions";
import { ClearMissingButton } from "./clear-missing-button";
import { UploadForm } from "./upload-form";

const t = messages.import;

const dayText = (date: Date) => date.toISOString().slice(0, 10);

export default async function ImportPage(props: PageProps<"/import">) {
  await requireCapability(canImportSchedule);
  const { run } = await props.searchParams;
  const runId = Array.isArray(run) ? run[0] : run;
  const [runs, missing, savedRun] = await Promise.all([
    listImportRuns(),
    listMissingFlights(),
    runId ? findImportRun(runId) : null,
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="max-w-3xl text-sm text-neutral-600">{t.intro}</p>
      {savedRun && (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {fmt(t.saved, { summary: importSummaryText({ ...savedRun.summary }) })}
        </p>
      )}

      <section className="flex max-w-2xl flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{t.upload}</h2>
        <UploadForm action={uploadScheduleFile} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{t.missing.title}</h2>
        <p className="max-w-3xl text-sm text-neutral-600">{t.missing.hint}</p>
        {missing.length === 0 ? (
          <p className="text-sm text-neutral-500">{t.missing.empty}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-600 uppercase">
                <tr>
                  {Object.values(t.missing.columns).map((label) => (
                    <th key={label} className="px-3 py-2">
                      {label}
                    </th>
                  ))}
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {missing.map((flight) => (
                  <tr key={flight.id}>
                    <td className="px-3 py-2 font-medium">{flightLabel(flight)}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {flight.sta ? `${formatDateTime(flight.sta)} · ${flight.origin ?? "–"}` : "–"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {flight.std ? `${formatDateTime(flight.std)} · ${flight.destination ?? "–"}` : "–"}
                    </td>
                    <td className="px-3 py-2">
                      {[
                        flight.arrivalMissing ? t.dryRun.missingParts.ARRIVAL_PART : null,
                        flight.departureMissing ? t.dryRun.missingParts.DEPARTURE_PART : null,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </td>
                    <td className="px-3 py-2 text-xs text-neutral-600">
                      {flight.missingImportRun
                        ? `${formatDateTime(flight.missingImportRun.createdAt)} · ${flight.missingImportRun.fileName}`
                        : "–"}
                    </td>
                    <td className="px-3 py-2">
                      <ClearMissingButton action={clearMissingMarker.bind(null, flight.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{t.runs.title}</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-neutral-500">{t.runs.empty}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-600 uppercase">
                <tr>
                  {Object.values(t.runs.columns).map((label) => (
                    <th key={label} className="px-3 py-2">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {runs.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-3 py-2 whitespace-nowrap tabular-nums">{formatDateTime(item.createdAt)}</td>
                    <td className="px-3 py-2">{item.createdBy.name}</td>
                    <td className="px-3 py-2">{item.fileName}</td>
                    <td className="px-3 py-2">{item.profile?.name ?? t.runs.noProfile}</td>
                    <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                      {dayText(item.rangeStart)} – {dayText(item.rangeEnd)}
                    </td>
                    <td className="px-3 py-2 text-xs">{importSummaryText({ ...item.summary })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
