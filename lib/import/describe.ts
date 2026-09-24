import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import type { MappingProblem, RowError } from "./mapping";

// Hungarian text of what the import finds wrong, shared by the server actions
// and the mapping screen.

const t = messages.import;

export function describeProblem(problem: MappingProblem): string {
  if (problem.kind === "missingField") return fmt(t.problems.missingField, { field: t.fields[problem.field] });
  if (problem.kind === "unknownColumn") {
    return fmt(t.problems.unknownColumn, { field: t.fields[problem.field], column: problem.column });
  }
  return t.problems.incompletePeriod;
}

export function describeRowError(error: RowError): string {
  const reason = t.rowErrors[error.code];
  return error.value ? `${reason}: „${error.value.trim()}”` : reason;
}

/** "12 új, 3 változott, …" of a saved import. */
export function importSummaryText(summary: Record<string, number>): string {
  return fmt(t.runs.summary, summary);
}
