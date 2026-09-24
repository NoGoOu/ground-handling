"use client";

import { useActionState, useState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import type { ActionResult } from "@/lib/action";
import { describeProblem, describeRowError } from "@/lib/import/describe";
import {
  legsFromRow,
  mappingProblems,
  REQUIRED_FIELDS,
  resolveMapping,
  type ImportMapping,
  type TargetField,
} from "@/lib/import/mapping";
import type { Cell } from "@/lib/import/read";
import type { TimeZone } from "@/lib/import/transform";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { formatDateTime } from "@/lib/time";
import type { DryRunState } from "../actions";
import { DryRunResult } from "./dry-run-result";

const t = messages.import;

type Action = (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;
type DryRunAction = (state: DryRunState, formData: FormData) => Promise<DryRunState>;

const FIELD_GROUPS: TargetField[][] = [
  ["airline", "flightNumber", "suffix", "origin", "destination"],
  ["periodFrom", "periodTill", "pattern", "date"],
  ["std", "sta", "dayOffset"],
  ["aircraftType", "aircraftConfig", "nextAirline", "nextFlightNumber"],
];

const stationOf = (cell: Cell) => String(cell ?? "").trim().toUpperCase();

/**
 * The column mapping of the import (3. mérföldkő, 5. lépés). The preview runs
 * the same pure transformations as the server, on the first rows of the file.
 */
export function MappingForm({
  headers,
  previewRows,
  initial,
  station,
  profileId,
  profileName,
  saveProfileAction,
  dryRunAction,
}: {
  headers: string[];
  previewRows: Cell[][];
  initial: ImportMapping;
  station: string;
  /** The loaded profile; the missing check needs one. */
  profileId: string | null;
  profileName: string;
  saveProfileAction: Action;
  dryRunAction: DryRunAction;
}) {
  const [columns, setColumns] = useState(initial.columns);
  const [timeZone, setTimeZone] = useState<TimeZone>(initial.timeZone);
  const [range, setRange] = useState({ start: "", end: "" });
  const [saved, saveFormAction, saving] = useActionState(saveProfileAction, null);
  const [dryRun, dryRunFormAction, running] = useActionState(dryRunAction, {});

  const mapping: ImportMapping = { sheet: initial.sheet, headerRow: initial.headerRow, columns, timeZone };
  const problems = mappingProblems(mapping, headers);
  const activeRange = range.start && range.end && range.start <= range.end ? range : undefined;

  // A handful of rows: cheap enough to read again on every change.
  const resolved = problems.length === 0 ? resolveMapping(mapping, headers) : null;
  const preview = !resolved
    ? []
    : previewRows.map((row, index) => {
        const rowNumber = index + 1;
        if (stationOf(row[resolved.origin]) !== station && stationOf(row[resolved.destination]) !== station) {
          return { rowNumber, kind: "filtered" as const };
        }
        const { legs, errors } = legsFromRow(row, rowNumber, resolved, activeRange);
        if (errors.length > 0) return { rowNumber, kind: "error" as const, text: describeRowError(errors[0]) };
        if (legs.length === 0) return { rowNumber, kind: "empty" as const };
        return { rowNumber, kind: "legs" as const, leg: legs[0], count: legs.length };
      });

  const setColumn = (field: TargetField, column: string) =>
    setColumns((current) => ({ ...current, [field]: column || undefined }));

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{t.mapping}</h2>
        <p className="text-sm text-neutral-600">{t.mappingHint}</p>
        <div className="grid gap-4 lg:grid-cols-2">
          {FIELD_GROUPS.map((group, index) => (
            <div key={index} className="flex flex-col gap-2 rounded-lg border border-neutral-100 p-3">
              {group.map((field) => (
                <label key={field} className="grid grid-cols-[12rem_1fr] items-center gap-2 text-sm">
                  <span className="text-neutral-700">
                    {t.fields[field]}
                    {REQUIRED_FIELDS.includes(field) && <span className="ml-1 text-xs text-red-700">({t.required})</span>}
                  </span>
                  <select
                    value={columns[field] ?? ""}
                    onChange={(event) => setColumn(field, event.target.value)}
                    className="input py-1 text-sm"
                  >
                    <option value="">{t.notMapped}</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-6">
          <fieldset className="flex flex-col gap-1">
            <legend className="text-sm font-medium text-neutral-700">{t.timeZone}</legend>
            <div className="flex gap-4 text-sm">
              {(["UTC", "LOCAL"] as const).map((zone) => (
                <label key={zone} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="timeZone"
                    checked={timeZone === zone}
                    onChange={() => setTimeZone(zone)}
                    className="size-4"
                  />
                  {t.timeZones[zone]}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-1">
            <legend className="text-sm font-medium text-neutral-700">
              {t.range} <span className="font-normal text-neutral-500">({t.rangeHint})</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 text-sm">
                <span className="sr-only">{t.rangeStart}</span>
                <input
                  type="date"
                  aria-label={t.rangeStart}
                  value={range.start}
                  onChange={(event) => setRange((r) => ({ ...r, start: event.target.value }))}
                  className="input w-auto py-1 text-sm"
                />
              </label>
              <span className="self-center text-neutral-500">–</span>
              <label className="flex items-center gap-2 text-sm">
                <span className="sr-only">{t.rangeEnd}</span>
                <input
                  type="date"
                  aria-label={t.rangeEnd}
                  value={range.end}
                  onChange={(event) => setRange((r) => ({ ...r, end: event.target.value }))}
                  className="input w-auto py-1 text-sm"
                />
              </label>
            </div>
          </fieldset>
        </div>
        <p className="text-sm text-neutral-600">{fmt(t.station, { station })}</p>

        {problems.length > 0 && (
          <ul role="alert" className="flex flex-col gap-1 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            {problems.map((problem, index) => (
              <li key={index}>{describeProblem(problem)}</li>
            ))}
          </ul>
        )}
      </section>

      {preview.length > 0 && (
        <section className="flex flex-col gap-2">
          <div>
            <h2 className="font-semibold">{t.readPreview}</h2>
            <p className="text-sm text-neutral-600">{t.readPreviewHint}</p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                <tr>
                  {Object.values(t.readColumns).map((label) => (
                    <th key={label} className="px-2 py-1.5 whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {preview.map((item) => (
                  <tr key={item.rowNumber} className={item.kind === "filtered" ? "text-neutral-400" : ""}>
                    <td className="px-2 py-1 tabular-nums">{item.rowNumber}</td>
                    {item.kind === "legs" ? (
                      <>
                        <td className="px-2 py-1 font-medium">{item.leg.flightNumber}</td>
                        <td className="px-2 py-1">
                          {item.leg.origin} → {item.leg.destination}
                        </td>
                        <td className="px-2 py-1 tabular-nums">{item.leg.flightDate}</td>
                        <td className="px-2 py-1 tabular-nums">{item.count}</td>
                        <td className="px-2 py-1 tabular-nums">{formatDateTime(item.leg.std)}</td>
                        <td className="px-2 py-1 tabular-nums">{formatDateTime(item.leg.sta)}</td>
                        <td className="px-2 py-1">{item.leg.next ?? "–"}</td>
                        <td className="px-2 py-1">{item.leg.aircraftType ?? "–"}</td>
                      </>
                    ) : (
                      <td colSpan={8} className={`px-2 py-1 ${item.kind === "error" ? "text-red-700" : ""}`}>
                        {item.kind === "filtered"
                          ? fmt(t.filteredRow, { station })
                          : item.kind === "error"
                            ? item.text
                            : t.noLegs}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <form action={dryRunFormAction} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="mapping" value={JSON.stringify(mapping)} />
        <input type="hidden" name="start" value={range.start} />
        <input type="hidden" name="end" value={range.end} />
        <input type="hidden" name="profileId" value={profileId ?? ""} />
        <button type="submit" disabled={running || problems.length > 0} className="btn btn-primary">
          {running ? t.dryRun.running : t.dryRun.submit}
        </button>
        {dryRun.error && (
          <span role="alert" className="text-sm font-medium text-red-700">
            {dryRun.error}
          </span>
        )}
      </form>
      {dryRun.view && <DryRunResult view={dryRun.view} station={station} />}

      <form action={saveFormAction} className="flex flex-col gap-2 rounded-xl border border-dashed border-neutral-300 bg-white p-4">
        <h2 className="font-semibold">{t.profileSave}</h2>
        <input type="hidden" name="mapping" value={JSON.stringify(mapping)} />
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-neutral-700">{t.profileName}</span>
            <input name="name" defaultValue={profileName} maxLength={60} required className="input w-72 py-1.5" />
          </label>
          <button type="submit" disabled={saving || problems.length > 0} className="btn btn-secondary">
            {t.profileSubmit}
          </button>
        </div>
        <ActionFeedback result={saved} successText={t.profileSaved} />
      </form>
    </div>
  );
}
