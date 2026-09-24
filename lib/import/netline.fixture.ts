import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NETLINE_MAPPING } from "./netline";
import { readFile, tableFrom } from "./read";

// Test helpers for the NetLine sample (tests/fixtures/schedule): the file read
// into a table. The mapping lives in ./netline, the seed saves it as a profile.

export { NETLINE_MAPPING };

export const NETLINE_SAMPLE = join(process.cwd(), "tests/fixtures/schedule/ryanair-netline-bud-sample.xlsx");

export function netlineTable() {
  const file = readFile("ryanair-netline-bud-sample.xlsx", readFileSync(NETLINE_SAMPLE));
  const sheet = file.sheets.find((s) => s.name === NETLINE_MAPPING.sheet)!;
  return tableFrom(sheet.rows, NETLINE_MAPPING.headerRow - 1);
}
