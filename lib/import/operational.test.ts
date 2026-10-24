import { describe, expect, it } from "vitest";
import { isOperational, type OperationalFacts } from "@/lib/import/operational";

const at = new Date("2026-10-01T08:00:00Z");
const quiet: OperationalFacts = {
  events: 0,
  eta: null,
  etd: null,
  ata: null,
  atd: null,
  etaSource: null,
  etdSource: null,
  arrivalCancelled: false,
  departureCancelled: false,
  arrivalAodbId: null,
  departureAodbId: null,
  tasks: [{ arrivalAgentId: null, departureAgentId: null, records: 0 }],
};

describe("operational data of a flight", () => {
  it("counts estimates, actuals, cancellations, assignments, records and log entries for the schedule import", () => {
    expect(isOperational(quiet)).toBe(false);
    for (const facts of [
      { eta: at, etaSource: "IKARUS" as const },
      { atd: at },
      { departureCancelled: true },
      { events: 1 },
      { tasks: [{ arrivalAgentId: "u1", departureAgentId: null, records: 0 }] },
      { tasks: [{ arrivalAgentId: null, departureAgentId: null, records: 2 }] },
    ]) {
      expect(isOperational({ ...quiet, ...facts })).toBe(true);
    }
  });

  it("leaves out what the Ikarus import wrote itself on its re-runs", () => {
    const ikarus = { ikarus: true };
    expect(isOperational({ ...quiet, eta: at, etaSource: "IKARUS", etd: at, etdSource: "IKARUS" }, ikarus)).toBe(false);
    expect(isOperational({ ...quiet, ata: at, arrivalAodbId: 1, atd: at, departureAodbId: 2 }, ikarus)).toBe(false);
    // A delay recorded by hand, an actual on a part Ikarus does not know, and the rest still count.
    expect(isOperational({ ...quiet, eta: at, etaSource: "MANUAL" }, ikarus)).toBe(true);
    expect(isOperational({ ...quiet, atd: at, arrivalAodbId: 1 }, ikarus)).toBe(true);
    expect(isOperational({ ...quiet, events: 1 }, ikarus)).toBe(true);
    expect(isOperational({ ...quiet, tasks: [{ arrivalAgentId: null, departureAgentId: "u2", records: 0 }] }, ikarus)).toBe(true);
  });
});
