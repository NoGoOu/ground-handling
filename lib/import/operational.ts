// Whether a flight has operational data (CLAUDE.md, 3. mérföldkő,
// "Összevonás újraimportáláskor"): records, estimates, actuals, cancellations,
// assignments or log entries. Such a flight keeps its pairing, and a merge
// never deletes it.
//
// The Ikarus import writes estimates and actuals itself (CLAUDE.md,
// "Közbeiktatva: valós járatok az Ikarus-mentésből"). For its re-runs those do
// not count, so a pairing it made can still change: an estimate from Ikarus,
// and an actual time on a part it knows by its AODB id. Anything from a
// message leaves a log entry, so it still counts.

export interface OperationalFacts {
  /** Entries in the flight's log. */
  events: number;
  eta: Date | null;
  etd: Date | null;
  ata: Date | null;
  atd: Date | null;
  etaSource: "MANUAL" | "MESSAGE" | "IKARUS" | null;
  etdSource: "MANUAL" | "MESSAGE" | "IKARUS" | null;
  arrivalCancelled: boolean;
  departureCancelled: boolean;
  arrivalAodbId: number | null;
  departureAodbId: number | null;
  tasks: readonly { arrivalAgentId: string | null; departureAgentId: string | null; records: number }[];
}

export function isOperational(flight: OperationalFacts, { ikarus = false }: { ikarus?: boolean } = {}): boolean {
  const estimates = ikarus
    ? (!!flight.eta && flight.etaSource !== "IKARUS") || (!!flight.etd && flight.etdSource !== "IKARUS")
    : !!(flight.eta || flight.etd);
  const actuals = ikarus
    ? (!!flight.ata && flight.arrivalAodbId === null) || (!!flight.atd && flight.departureAodbId === null)
    : !!(flight.ata || flight.atd);
  return (
    flight.events > 0 ||
    estimates ||
    actuals ||
    flight.arrivalCancelled ||
    flight.departureCancelled ||
    flight.tasks.some((task) => !!task.arrivalAgentId || !!task.departureAgentId || task.records > 0)
  );
}
