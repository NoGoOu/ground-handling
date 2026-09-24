import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { headerFingerprint } from "@/lib/import/fingerprint";
import { detectFormat, readFile, ReadError, tableFrom } from "@/lib/import/read";

const FIXTURE = join(process.cwd(), "tests/fixtures/schedule/ryanair-netline-bud-sample.xlsx");
const bytes = (text: string) => new TextEncoder().encode(text);

const NETLINE_HEADERS = [
  "NO", "Al", "FlNo", "S", "From", "Till", "Pattern", "Orig",
  "STD (UTC)", "STD (Local Time)", "STA (UTC)", "STA (Local Time)", "DD", "Dest",
  "Own", "A/C", "Cfg", "ACV", "ST", "Blkt", "OnwdEventGt", "OnwdEventAl", "OnwdEventFlNo",
];

describe("format", () => {
  it("comes from the file extension", () => {
    expect(detectFormat("menetrend.XLSX")).toBe("xlsx");
    expect(detectFormat("export.xls")).toBe("xls");
    expect(detectFormat("flights.csv")).toBe("csv");
    expect(detectFormat("flights.json")).toBe("json");
    expect(detectFormat("notes.txt")).toBeNull();
  });
});

describe("the NetLine sample (XLSX)", () => {
  const file = readFile("ryanair-netline-bud-sample.xlsx", readFileSync(FIXTURE));
  const data = file.sheets[0];
  const table = tableFrom(data.rows, 0);

  it("has both sheets, the data first", () => {
    expect(file.format).toBe("xlsx");
    expect(file.sheets.map((sheet) => sheet.name)).toEqual(["Template_Auto_Export(netline)", "Legend"]);
  });

  it("reads the header row and the 14 data rows", () => {
    expect(table.headers).toEqual(NETLINE_HEADERS);
    expect(table.rows).toHaveLength(14);
  });

  it("keeps the raw cells: Excel day numbers, day fractions and untrimmed text", () => {
    const [first] = table.rows;
    const column = (name: string) => NETLINE_HEADERS.indexOf(name);
    expect(first[column("Al")]).toBe("FR");
    expect(first[column("FlNo")]).toBe("9941");
    expect(first[column("From")]).toBe(45545); // 2024-09-10
    expect(first[column("Pattern")]).toBe(".2.....");
    expect(first[column("STA (UTC)")]).toBeCloseTo(7.25 / 24); // 07:15
    expect(table.rows[2][column("OnwdEventFlNo")]).toBe("N/A");
    expect(table.rows[11][column("DD")]).toBe("+1");
    expect(table.rows[12][column("FlNo")]).toBe(" 428");
  });
});

describe("CSV and XLS", () => {
  it("reads a CSV file as text, below a chosen header row", () => {
    const csv = "Export 2024-09-06\n\nAl,FlNo,STA\nFR, 9941,07:15\nFR,9942,\n";
    const file = readFile("schedule.csv", bytes(csv));
    const table = tableFrom(file.sheets[0].rows, 2);
    expect(table.headers).toEqual(["Al", "FlNo", "STA"]);
    expect(table.rows).toEqual([
      ["FR", " 9941", "07:15"],
      ["FR", "9942", null],
    ]);
  });

  it("reads a legacy XLS workbook", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Al", "FlNo"], ["FR", 9941]]), "Flights");
    const xls = XLSX.write(workbook, { type: "array", bookType: "biff8" }) as ArrayBuffer;
    const file = readFile("old.xls", new Uint8Array(xls));
    expect(file.sheets[0].name).toBe("Flights");
    expect(tableFrom(file.sheets[0].rows, 0)).toEqual({ headers: ["Al", "FlNo"], rows: [["FR", 9941]] });
  });
});

describe("JSON", () => {
  it("turns an array of objects into a table", () => {
    const file = readFile("f.json", bytes(JSON.stringify([{ Al: "FR", FlNo: "9941" }, { Al: "FR", FlNo: "9942", S: "A" }])));
    expect(tableFrom(file.sheets[0].rows, 0)).toEqual({
      headers: ["Al", "FlNo", "S"],
      rows: [
        ["FR", "9941", null],
        ["FR", "9942", "A"],
      ],
    });
  });

  it("gives one sheet per array property", () => {
    const file = readFile("f.json", bytes(JSON.stringify({ meta: { season: "W24" }, flights: [["Al"], ["FR"]] })));
    expect(file.sheets.map((sheet) => sheet.name)).toEqual(["flights"]);
  });

  it("rejects broken or empty files", () => {
    expect(() => readFile("f.json", bytes("{ not json"))).toThrow(ReadError);
    expect(() => readFile("f.json", bytes("{}"))).toThrow(ReadError);
    expect(() => readFile("f.csv", bytes(""))).toThrow(ReadError);
  });
});

describe("header fingerprint", () => {
  it("ignores case and spacing but not the column order", () => {
    expect(headerFingerprint(["Al", "FlNo", "STD (UTC)"])).toBe(headerFingerprint([" al", "FLNO ", "std  (utc)"]));
    expect(headerFingerprint(["Al", "FlNo"])).not.toBe(headerFingerprint(["FlNo", "Al"]));
  });
});
