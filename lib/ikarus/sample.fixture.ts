// Made-up AODB records for the tests, in the shape of the real files
// (CLAUDE.md: the real snapshots never go into the repository). The flight
// numbers (QQ…, QQX…), airports (AAA, BBB) and registrations (XXQ…) are
// invented.

export interface SampleRecord {
  id: number;
  flightNumber: string;
  route: string;
  scheduledTime: string;
  estimatedTime: string | null;
  actualTime: string | null;
  standExt: string;
  gate: string | null;
  registration: string | null;
  aircraftTypeIata: string;
  pax: number;
  cargoWeight: number;
  bagWeight: number;
  mailWeight: number;
  checkInRange: string | null;
  handlerCargo: string | null;
  handlerPax: null;
  bestSlot: string | null;
  bound: string;
  isUpdated: boolean;
}

export function sampleRecord(overrides: Partial<SampleRecord> = {}): SampleRecord {
  return {
    id: 900001,
    flightNumber: "QQ1234",
    route: "AAA",
    scheduledTime: "01.10.2026 07:20",
    estimatedTime: null,
    actualTime: null,
    standExt: "10",
    gate: null,
    registration: "XXQAA",
    aircraftTypeIata: "320",
    pax: 0,
    cargoWeight: 0,
    bagWeight: 0,
    mailWeight: 0,
    checkInRange: null,
    handlerCargo: null,
    handlerPax: null,
    bestSlot: null,
    bound: "1",
    isUpdated: false,
    ...overrides,
  };
}

/** A snapshot file's text, optionally with a byte order mark. */
export function sampleSnapshotText(
  arrivals: readonly SampleRecord[],
  departures: readonly SampleRecord[],
  { bom = false, updateDate = "01/10/2026 06:11" }: { bom?: boolean; updateDate?: string } = {},
): string {
  const json = JSON.stringify({
    success: true,
    message: null,
    data: { arrivalFlights: arrivals, departureFlights: departures, updateDate },
    errors: null,
    code: 200,
  });
  return bom ? `﻿${json}` : json;
}
