import { describe, expect, it } from "vitest";
import { legsFromRow, mappingProblems, resolveMapping, type ImportMapping } from "@/lib/import/mapping";
import { NETLINE_MAPPING, netlineTable } from "@/lib/import/netline.fixture";

const table = netlineTable();
const resolved = resolveMapping(NETLINE_MAPPING, table.headers);

/** Data rows are numbered from 1, as in docs/schedule-import.md. */
const legsOf = (rowNumber: number, range?: { start: string; end: string }) =>
  legsFromRow(table.rows[rowNumber - 1], rowNumber, resolved, range);

describe("mapping check", () => {
  it("accepts the NetLine mapping", () => {
    expect(mappingProblems(NETLINE_MAPPING, table.headers)).toEqual([]);
  });

  it("names a missing required field, an unknown column and a half period", () => {
    const broken: ImportMapping = {
      ...NETLINE_MAPPING,
      columns: { ...NETLINE_MAPPING.columns, sta: undefined, origin: "Origin", pattern: undefined },
    };
    expect(mappingProblems(broken, table.headers)).toEqual([
      { kind: "missingField", field: "sta" },
      { kind: "unknownColumn", field: "origin", column: "Origin" },
      { kind: "incompletePeriod" },
    ]);
  });
});

describe("legs of the NetLine sample", () => {
  it("expands a weekly row to its operating dates, with times in UTC", () => {
    const { legs, errors } = legsOf(1);
    expect(errors).toEqual([]);
    expect(legs).toHaveLength(7);
    expect(legs[0]).toEqual({
      row: 1,
      airline: "FR",
      flightNumber: "FR9941",
      origin: "ALC",
      destination: "BUD",
      flightDate: "2024-09-10",
      std: new Date("2024-09-10T04:10:00Z"),
      sta: new Date("2024-09-10T07:15:00Z"),
      aircraftType: "738",
      aircraftConfig: "Y189",
      registration: null,
      next: "FR9942",
    });
    expect(legs.at(-1)?.flightDate).toBe("2024-10-22");
  });

  it("reads 'N/A' as no next flight", () => {
    const { legs } = legsOf(3);
    expect(legs).toHaveLength(1);
    expect(legs[0].sta).toEqual(new Date("2025-01-07T20:25:00Z"));
    expect(legs[0].next).toBeNull();
  });

  it("normalises the next flight number too", () => {
    expect(legsOf(4).legs[0].next).toBe("FR224");
  });

  it("moves the arrival to the next day by DD = +1", () => {
    const { legs } = legsOf(12);
    expect(legs[0].flightNumber).toBe("FR1027");
    expect(legs[0].std).toEqual(new Date("2024-10-30T21:10:00Z"));
    expect(legs[0].sta).toEqual(new Date("2024-10-31T00:25:00Z"));
  });

  it("trims a flight number that starts with a space", () => {
    expect(legsOf(13).legs[0].flightNumber).toBe("FR428");
  });

  it("keeps to the import's date range", () => {
    expect(legsOf(1, { start: "2024-09-15", end: "2024-09-30" }).legs.map((leg) => leg.flightDate)).toEqual([
      "2024-09-17",
      "2024-09-24",
    ]);
  });

  it("gives the same instants from the Budapest local columns", () => {
    const local = resolveMapping(
      { ...NETLINE_MAPPING, timeZone: "LOCAL", columns: { ...NETLINE_MAPPING.columns, sta: "STA (Local Time)" } },
      table.headers,
    );
    const [arrival] = legsFromRow(table.rows[0], 1, local).legs;
    expect(arrival.sta).toEqual(new Date("2024-09-10T07:15:00Z"));
  });
});

describe("row errors", () => {
  it("reports the row, the problem and the raw value", () => {
    const row = [...table.rows[0]];
    row[resolved.pattern] = "2......";
    expect(legsFromRow(row, 1, resolved)).toEqual({
      legs: [],
      errors: [{ row: 1, code: "pattern", value: "2......" }],
    });
  });

  it("rejects a station that is not a three-letter code", () => {
    const row = [...table.rows[0]];
    row[resolved.destination] = "Budapest";
    expect(legsFromRow(row, 1, resolved).errors[0].code).toBe("station");
  });
});

describe("registration (7. mérföldkő)", () => {
  it("reads a registration column when the mapping has one, without separators", () => {
    const withReg = {
      headers: [...table.headers, "Reg"],
      rows: table.rows.map((row) => [...row, "ha-lya"]),
    };
    const mapping = resolveMapping(
      { ...NETLINE_MAPPING, columns: { ...NETLINE_MAPPING.columns, registration: "Reg" } },
      withReg.headers,
    );
    const { legs } = legsFromRow(withReg.rows[0], 1, mapping);
    expect(legs[0].registration).toBe("HALYA");
    expect(legsOf(1).legs[0].registration).toBeNull();
  });
});
