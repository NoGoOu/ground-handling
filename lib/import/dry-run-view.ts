import { flightLabel } from "@/lib/flight";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { formatDateTime } from "@/lib/time";
import { flightKind } from "@/lib/turnaround";
import { describeRowError } from "./describe";
import type { DiffEntry, ExistingFlight, FieldChange, ImportDiff } from "./diff";
import type { ImportedTurnaround, ImportPlan, PairingWarning } from "./pairing";

// What the planner sees after a dry run (3. mérföldkő, 6. lépés): counts and,
// per group, the rows as text. Built on the server; nothing is written.

const t = messages.import.dryRun;

export type SummaryKey = "new" | "changed" | "repaired" | "unchanged" | "conflicts" | "errors" | "unpaired" | "missing";
export type GroupKind = "error" | "conflict" | "changed" | "new" | "missing" | "warning" | "unchanged";

export interface DryRunGroup {
  kind: GroupKind;
  columns: string[];
  rows: string[][];
  /** Rows left out of the list. */
  more: number;
}

export interface DryRunView {
  summary: Record<SummaryKey, number>;
  filteredRows: number;
  totalRows: number;
  period: { start: string; end: string } | null;
  /** Missing flights were looked for (a saved profile was used). */
  missingChecked: boolean;
  groups: DryRunGroup[];
}

const TURNAROUND_COLUMNS = [t.columns.flight, t.columns.arrival, t.columns.departure, t.columns.kind, t.columns.note];

function valueText(value: string | Date | null): string {
  if (value === null) return "–";
  return value instanceof Date ? formatDateTime(value) : value;
}

function changeText(change: FieldChange): string {
  return fmt(t.change, { field: t.changeFields[change.field], from: valueText(change.from), to: valueText(change.to) });
}

function turnaroundRow(turnaround: ImportedTurnaround, note: string): string[] {
  const { arrival, departure } = turnaround;
  return [
    flightLabel({
      inboundFlightNumber: arrival?.flightNumber ?? null,
      outboundFlightNumber: departure?.flightNumber ?? null,
    }),
    arrival ? `${formatDateTime(arrival.sta)} · ${arrival.origin}` : "–",
    departure ? `${formatDateTime(departure.std)} · ${departure.destination}` : "–",
    messages.flightKind[turnaround.kind],
    note,
  ];
}

function entryNote(entry: DiffEntry): string {
  switch (entry.kind) {
    case "changed":
      return [entry.repair ? t.repair : null, ...entry.changes.map(changeText)].filter(Boolean).join("; ");
    case "conflict":
      return t.reasons[entry.reason];
    case "error":
      return fmt(t.reasons[entry.reason], { code: entry.turnaround.airline });
    default:
      return "";
  }
}

function warningText(warning: PairingWarning): string {
  const leg = warning.kind === "duplicate" ? warning.leg : warning.arrival;
  return fmt(t.warnings[warning.kind], {
    flight: leg.flightNumber,
    date: leg.flightDate,
    next: leg.next ?? "",
    row: leg.row,
  });
}

export function dryRunView({
  plan,
  diff,
  existing,
  period,
  profileId,
  limit = 200,
}: {
  plan: ImportPlan;
  diff: ImportDiff;
  existing: readonly ExistingFlight[];
  period: { start: string; end: string } | null;
  profileId: string | null;
  limit?: number;
}): DryRunView {
  const byKind = (kind: DiffEntry["kind"]) => diff.entries.filter((entry) => entry.kind === kind);
  const changed = byKind("changed");
  const flightErrors = byKind("error");

  const group = (kind: GroupKind, columns: string[], rows: string[][]): DryRunGroup => ({
    kind,
    columns,
    rows: rows.slice(0, limit),
    more: Math.max(0, rows.length - limit),
  });
  const existingById = new Map(existing.map((flight) => [flight.id, flight]));

  const groups = [
    group("error", TURNAROUND_COLUMNS, [
      ...plan.rowErrors.map((error) => [fmt("{row}. sor", { row: error.row }), "–", "–", "–", describeRowError(error)]),
      ...flightErrors.map((entry) => turnaroundRow(entry.turnaround, entryNote(entry))),
    ]),
    group("conflict", TURNAROUND_COLUMNS, byKind("conflict").map((e) => turnaroundRow(e.turnaround, entryNote(e)))),
    group("changed", TURNAROUND_COLUMNS, changed.map((e) => turnaroundRow(e.turnaround, entryNote(e)))),
    group("new", TURNAROUND_COLUMNS, byKind("new").map((e) => turnaroundRow(e.turnaround, ""))),
    group(
      "missing",
      TURNAROUND_COLUMNS,
      diff.missing.map(({ flightId, parts }) => {
        const flight = existingById.get(flightId)!;
        return [
          flightLabel(flight),
          flight.sta ? `${formatDateTime(flight.sta)} · ${flight.origin ?? "–"}` : "–",
          flight.std ? `${formatDateTime(flight.std)} · ${flight.destination ?? "–"}` : "–",
          messages.flightKind[flightKind(flight)],
          parts.map((part) => t.missingParts[part]).join(", "),
        ];
      }),
    ),
    group("warning", [t.columns.note], plan.warnings.map((warning) => [warningText(warning)])),
    group("unchanged", TURNAROUND_COLUMNS, byKind("unchanged").map((e) => turnaroundRow(e.turnaround, ""))),
  ].filter((g) => g.rows.length > 0);

  return {
    summary: {
      new: byKind("new").length,
      changed: changed.filter((e) => e.kind === "changed" && !e.repair).length,
      repaired: changed.filter((e) => e.kind === "changed" && e.repair).length,
      unchanged: byKind("unchanged").length,
      conflicts: byKind("conflict").length,
      errors: plan.rowErrors.length + flightErrors.length,
      unpaired: plan.turnarounds.filter((turnaround) => turnaround.kind !== "TURNAROUND").length,
      missing: diff.missing.length,
    },
    filteredRows: plan.filteredRows,
    totalRows: plan.totalRows,
    period,
    missingChecked: !!profileId,
    groups,
  };
}
