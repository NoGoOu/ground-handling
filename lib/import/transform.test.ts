import { describe, expect, it } from "vitest";
import {
  cleanText,
  combineDateTime,
  expandPeriod,
  isBlank,
  normaliseFlightNumber,
  parseDate,
  parseDateTime,
  parseDayOffset,
  parsePattern,
  parseTime,
} from "@/lib/import/transform";

describe("blank cells and text", () => {
  it("treats empty cells and export placeholders as blank", () => {
    for (const cell of [null, "", " ", "N/A", "n/a", "-", "NULL"]) expect(isBlank(cell), String(cell)).toBe(true);
    expect(isBlank("FR")).toBe(false);
    expect(isBlank(0)).toBe(false);
  });

  it("trims text", () => {
    expect(cleanText("  ALC ")).toBe("ALC");
    expect(cleanText(" ")).toBeNull();
  });
});

describe("flight number", () => {
  it("joins the designator and the number, without spaces and leading zeros", () => {
    expect(normaliseFlightNumber("FR", "9941")).toEqual({ airline: "FR", flightNumber: "FR9941" });
    expect(normaliseFlightNumber("FR", " 428")).toEqual({ airline: "FR", flightNumber: "FR428" });
    expect(normaliseFlightNumber(" fr ", "055")).toEqual({ airline: "FR", flightNumber: "FR55" });
  });

  it("reads a combined cell and an operational suffix", () => {
    expect(normaliseFlightNumber(null, "FR 0428")).toEqual({ airline: "FR", flightNumber: "FR428" });
    expect(normaliseFlightNumber("W6", "2301", "a")).toEqual({ airline: "W6", flightNumber: "W62301A" });
    expect(normaliseFlightNumber(null, "RYR1234")?.flightNumber).toBe("RYR1234");
  });

  it("rejects what is not a flight number", () => {
    expect(normaliseFlightNumber("FR", "abc")).toBeNull();
    expect(normaliseFlightNumber(null, "1234")).toBeNull();
    expect(normaliseFlightNumber("FR", "N/A")).toBeNull();
    expect(normaliseFlightNumber("FR", "12345")).toBeNull();
  });
});

describe("dates", () => {
  it("reads Excel day numbers", () => {
    expect(parseDate(45545)).toBe("2024-09-10");
    expect(parseDate(45664)).toBe("2025-01-07");
  });

  it("reads the usual text forms, day first", () => {
    expect(parseDate("2024-09-10")).toBe("2024-09-10");
    expect(parseDate("10/SEP/2024")).toBe("2024-09-10");
    expect(parseDate("10sep24")).toBe("2024-09-10");
    expect(parseDate("10.09.2024")).toBe("2024-09-10");
    expect(parseDate("10/09/2024")).toBe("2024-09-10");
  });

  it("rejects days that do not exist and blanks", () => {
    expect(parseDate("31.04.2024")).toBeNull();
    expect(parseDate("2024-02-30")).toBeNull();
    expect(parseDate("N/A")).toBeNull();
  });
});

describe("times", () => {
  it("rounds an Excel day fraction to the minute it stores", () => {
    expect(parseTime(0.3020833333333333)).toBe(7 * 60 + 15);
    expect(parseTime(0.1736111111111111)).toBe(4 * 60 + 10);
    expect(parseTime(0.01736111111111111)).toBe(25);
    // A full date-time keeps only its time.
    expect(parseTime(45545.302083333336)).toBe(7 * 60 + 15);
  });

  it("reads text times and cuts written seconds off (rule 10)", () => {
    expect(parseTime("07:15")).toBe(435);
    expect(parseTime("7:15")).toBe(435);
    expect(parseTime("0715")).toBe(435);
    expect(parseTime("07:15:59")).toBe(435);
  });

  it("rejects impossible times", () => {
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("07:60")).toBeNull();
    expect(parseTime("soon")).toBeNull();
  });

  it("reads a date and a time from one cell", () => {
    expect(parseDateTime(45545.302083333336)).toEqual({ date: "2024-09-10", minutes: 435 });
    expect(parseDateTime("2024-09-10 07:15")).toEqual({ date: "2024-09-10", minutes: 435 });
    expect(parseDateTime("10/SEP/2024 07:15")).toEqual({ date: "2024-09-10", minutes: 435 });
    expect(parseDateTime("07:15")).toBeNull();
  });
});

describe("day offset", () => {
  it("reads +1, -1 and blank", () => {
    expect(parseDayOffset("+1")).toBe(1);
    expect(parseDayOffset("-1")).toBe(-1);
    expect(parseDayOffset("1")).toBe(1);
    expect(parseDayOffset(null)).toBe(0);
    expect(parseDayOffset(2)).toBe(2);
    expect(parseDayOffset("+x")).toBeNull();
  });
});

describe("combining date and time", () => {
  it("takes UTC as it is", () => {
    expect(combineDateTime("2024-09-10", 435, "UTC")).toEqual(new Date("2024-09-10T07:15:00Z"));
  });

  it("converts Budapest local time, summer and winter", () => {
    expect(combineDateTime("2024-09-10", 9 * 60 + 15, "LOCAL")).toEqual(new Date("2024-09-10T07:15:00Z"));
    expect(combineDateTime("2024-11-06", 22 * 60 + 10, "LOCAL")).toEqual(new Date("2024-11-06T21:10:00Z"));
  });

  it("applies the day offset", () => {
    expect(combineDateTime("2024-10-30", 25, "UTC", 1)).toEqual(new Date("2024-10-31T00:25:00Z"));
  });
});

describe("day pattern", () => {
  const week = (days: string) => [...days].map((d) => d === "x");

  it("reads the operated weekdays from Monday to Sunday", () => {
    expect(parsePattern(".2.....")).toEqual(week(".x....."));
    expect(parsePattern("123.5..")).toEqual(week("xxx.x.."));
    expect(parsePattern(".23....")).toEqual(week(".xx...."));
    expect(parsePattern("1234567")).toEqual(week("xxxxxxx"));
    expect(parsePattern(" 2     ")).toEqual(week(".x....."));
  });

  it("rejects a digit in the wrong place, an empty week or a wrong length", () => {
    expect(parsePattern("2......")).toBeNull();
    expect(parsePattern(".......")).toBeNull();
    expect(parsePattern(".2....")).toBeNull();
    expect(parsePattern(null)).toBeNull();
  });
});

describe("period expansion", () => {
  const tuesday = parsePattern(".2.....")!;

  it("lists the operating dates between From and Till", () => {
    const dates = expandPeriod("2024-09-10", "2024-10-22", tuesday);
    expect(dates).toEqual([
      "2024-09-10",
      "2024-09-17",
      "2024-09-24",
      "2024-10-01",
      "2024-10-08",
      "2024-10-15",
      "2024-10-22",
    ]);
  });

  it("keeps to the import's date range", () => {
    expect(expandPeriod("2024-09-10", "2024-10-22", tuesday, { start: "2024-09-15", end: "2024-09-30" })).toEqual([
      "2024-09-17",
      "2024-09-24",
    ]);
  });

  it("rejects a backwards or too long period", () => {
    expect(expandPeriod("2024-10-22", "2024-09-10", tuesday)).toBeNull();
    expect(expandPeriod("2024-01-01", "2025-06-30", tuesday)).toBeNull();
  });
});
