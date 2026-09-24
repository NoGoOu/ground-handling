import { headerFingerprint } from "./fingerprint";
import type { ImportMapping } from "./mapping";

// The Ryanair NetLine export (docs/schedule-import.md): the profile the seed
// saves, so the README's walk-through needs no setup. The tests check it
// against the sample file.

export const NETLINE_PROFILE_NAME = "Ryanair NetLine";

/** The header row of the export, in order. */
export const NETLINE_HEADERS = [
  "NO",
  "Al",
  "FlNo",
  "S",
  "From",
  "Till",
  "Pattern",
  "Orig",
  "STD (UTC)",
  "STD (Local Time)",
  "STA (UTC)",
  "STA (Local Time)",
  "DD",
  "Dest",
  "Own",
  "A/C",
  "Cfg",
  "ACV",
  "ST",
  "Blkt",
  "OnwdEventGt",
  "OnwdEventAl",
  "OnwdEventFlNo",
] as const;

export const NETLINE_FINGERPRINT = headerFingerprint(NETLINE_HEADERS);

export const NETLINE_MAPPING: ImportMapping = {
  sheet: "Template_Auto_Export(netline)",
  headerRow: 1,
  timeZone: "UTC",
  columns: {
    airline: "Al",
    flightNumber: "FlNo",
    suffix: "S",
    origin: "Orig",
    destination: "Dest",
    periodFrom: "From",
    periodTill: "Till",
    pattern: "Pattern",
    std: "STD (UTC)",
    sta: "STA (UTC)",
    dayOffset: "DD",
    aircraftType: "A/C",
    aircraftConfig: "Cfg",
    nextAirline: "OnwdEventAl",
    nextFlightNumber: "OnwdEventFlNo",
  },
};
