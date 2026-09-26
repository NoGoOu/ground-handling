import { normaliseHeader } from "./fingerprint";
import type { ImportMapping, TargetField } from "./mapping";

// A first mapping for a file without a profile: common header names of
// schedule exports. The planner checks and corrects it.

const CANDIDATES: Record<TargetField, readonly string[]> = {
  airline: ["al", "airline", "carrier", "légitársaság"],
  flightNumber: ["flno", "flight no", "flight number", "flight", "flt", "járatszám"],
  suffix: ["s", "suffix", "utótag"],
  origin: ["orig", "origin", "dep", "from station", "honnan"],
  destination: ["dest", "destination", "arr", "to station", "hová"],
  date: ["date", "flight date", "dátum"],
  periodFrom: ["from", "valid from", "eff from", "start"],
  periodTill: ["till", "to", "valid to", "eff to", "end"],
  pattern: ["pattern", "days", "frequency", "dow", "napminta"],
  std: ["std (utc)", "std utc", "std", "dep time"],
  sta: ["sta (utc)", "sta utc", "sta", "arr time"],
  dayOffset: ["dd", "day offset", "arr day"],
  aircraftType: ["a/c", "ac", "aircraft", "ac type", "equipment", "típus"],
  aircraftConfig: ["cfg", "config", "configuration"],
  registration: ["reg", "registration", "tail", "lajstrom"],
  nextAirline: ["onwdevental", "next al", "onward airline"],
  nextFlightNumber: ["onwdeventflno", "next flno", "onward flight", "next flight"],
};

/** Header names are matched case- and space-insensitively; each column is used once. */
export function guessMapping(sheet: string, headerRow: number, headers: readonly string[]): ImportMapping {
  const normalised = headers.map(normaliseHeader);
  const taken = new Set<number>();
  const columns: ImportMapping["columns"] = {};
  for (const [field, names] of Object.entries(CANDIDATES) as [TargetField, readonly string[]][]) {
    for (const name of names) {
      const index = normalised.findIndex((header, i) => header === name && !taken.has(i));
      if (index >= 0) {
        columns[field] = headers[index];
        taken.add(index);
        break;
      }
    }
  }
  const localTimes = !columns.std && headers.some((h) => /local/i.test(h));
  return { sheet, headerRow, columns, timeZone: localTimes ? "LOCAL" : "UTC" };
}
