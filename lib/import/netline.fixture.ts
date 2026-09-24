import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ImportMapping } from "./mapping";
import { readFile, tableFrom } from "./read";

// Test helpers for the NetLine sample (tests/fixtures/schedule): the file read
// into a table, and the mapping a planner would make for it.

export const NETLINE_SAMPLE = join(process.cwd(), "tests/fixtures/schedule/ryanair-netline-bud-sample.xlsx");

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

export function netlineTable() {
  const file = readFile("ryanair-netline-bud-sample.xlsx", readFileSync(NETLINE_SAMPLE));
  const sheet = file.sheets.find((s) => s.name === NETLINE_MAPPING.sheet)!;
  return tableFrom(sheet.rows, NETLINE_MAPPING.headerRow - 1);
}
