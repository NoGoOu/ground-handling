import * as XLSX from "xlsx";

// Reading an uploaded schedule file into plain grids (3. mérföldkő, 2. lépés).
// Every format ends up as sheets of rows of raw cells; interpreting the cells
// (dates, times, flight numbers) is left to the transformations.

export type Cell = string | number | boolean | null;

export type FileFormat = "csv" | "json" | "xlsx" | "xls";

export interface Sheet {
  name: string;
  rows: Cell[][];
}

export interface ParsedFile {
  format: FileFormat;
  sheets: Sheet[];
}

export interface Table {
  headers: string[];
  rows: Cell[][];
}

/** The upload limit; the full network export of an airline fits well under it. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export class ReadError extends Error {}

/** The format comes from the file name; the content is checked by reading it. */
export function detectFormat(fileName: string): FileFormat | null {
  const extension = fileName.toLowerCase().match(/\.([a-z]+)$/)?.[1];
  return extension === "csv" || extension === "json" || extension === "xlsx" || extension === "xls" ? extension : null;
}

function normaliseCell(value: unknown): Cell {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value);
}

/** Drops trailing empty rows and cells so that previews stay tidy. */
function trimGrid(rows: Cell[][]): Cell[][] {
  const trimmed = rows.map((row) => {
    let end = row.length;
    while (end > 0 && row[end - 1] === null) end--;
    return row.slice(0, end);
  });
  let last = trimmed.length;
  while (last > 0 && trimmed[last - 1].length === 0) last--;
  return trimmed.slice(0, last);
}

function readSpreadsheet(bytes: Uint8Array, format: "csv" | "xlsx" | "xls"): Sheet[] {
  // Raw values: dates stay Excel day numbers, CSV text stays text; the
  // transformations decide what a cell means.
  const workbook = XLSX.read(bytes, { type: "array", raw: true, cellDates: false, dense: true });
  return workbook.SheetNames.map((name) => {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
      header: 1,
      raw: true,
      defval: null,
      blankrows: true,
    });
    return { name: format === "csv" ? "CSV" : name, rows: trimGrid(rows.map((row) => row.map(normaliseCell))) };
  });
}

/** An array of objects becomes a header row plus one row per object. */
function objectsToGrid(items: unknown[]): Cell[][] {
  const headers: string[] = [];
  for (const item of items) {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      for (const key of Object.keys(item)) if (!headers.includes(key)) headers.push(key);
    }
  }
  const rows = items.map((item) =>
    headers.map((key) => normaliseCell((item as Record<string, unknown>)?.[key])),
  );
  return [headers, ...rows];
}

function arrayToGrid(items: unknown[]): Cell[][] {
  if (items.every((item) => Array.isArray(item))) {
    return (items as unknown[][]).map((row) => row.map(normaliseCell));
  }
  return objectsToGrid(items);
}

/**
 * JSON: a top-level array (of objects or of rows) is one sheet; an object with
 * array properties gives one sheet per property.
 */
function readJson(bytes: Uint8Array): Sheet[] {
  let data: unknown;
  try {
    data = JSON.parse(new TextDecoder("utf-8").decode(bytes));
  } catch (error) {
    throw new ReadError((error as Error).message);
  }
  if (Array.isArray(data)) return [{ name: "JSON", rows: trimGrid(arrayToGrid(data)) }];
  if (data && typeof data === "object") {
    const sheets = Object.entries(data)
      .filter(([, value]) => Array.isArray(value))
      .map(([name, value]) => ({ name, rows: trimGrid(arrayToGrid(value as unknown[])) }));
    if (sheets.length > 0) return sheets;
  }
  throw new ReadError("no table found");
}

export function readFile(fileName: string, bytes: Uint8Array): ParsedFile {
  const format = detectFormat(fileName);
  if (!format) throw new ReadError("unknown format");
  let sheets: Sheet[];
  try {
    sheets = format === "json" ? readJson(bytes) : readSpreadsheet(bytes, format);
  } catch (error) {
    if (error instanceof ReadError) throw error;
    throw new ReadError((error as Error).message);
  }
  if (sheets.every((sheet) => sheet.rows.length === 0)) throw new ReadError("empty");
  return { format, sheets };
}

/** Header text of a cell: trimmed, never empty (an empty header gets its column letter). */
function headerText(cell: Cell, index: number): string {
  const text = cell === null ? "" : String(cell).trim();
  return text || XLSX.utils.encode_col(index);
}

/** The table below the chosen header row (0-based); rows above it are ignored. */
export function tableFrom(rows: readonly Cell[][], headerRow: number): Table {
  const header = rows[headerRow] ?? [];
  const width = Math.max(header.length, ...rows.slice(headerRow + 1).map((row) => row.length), 0);
  const headers = Array.from({ length: width }, (_, index) => headerText(header[index] ?? null, index));
  const body = rows
    .slice(headerRow + 1)
    .filter((row) => row.some((cell) => cell !== null && String(cell).trim() !== ""))
    .map((row) => Array.from({ length: width }, (_, index) => row[index] ?? null));
  return { headers, rows: body };
}
