import { describe, expect, it } from "vitest";
import { guessMapping } from "@/lib/import/guess";
import { NETLINE_MAPPING, netlineTable } from "@/lib/import/netline.fixture";

describe("first mapping of a file", () => {
  it("finds the NetLine columns by their headers", () => {
    const table = netlineTable();
    expect(guessMapping(NETLINE_MAPPING.sheet, 1, table.headers)).toEqual(NETLINE_MAPPING);
  });

  it("maps a simple file with a date column", () => {
    const guess = guessMapping("CSV", 1, ["Flight", "Date", "Origin", "Destination", "STD", "STA"]);
    expect(guess.columns).toEqual({
      flightNumber: "Flight",
      date: "Date",
      origin: "Origin",
      destination: "Destination",
      std: "STD",
      sta: "STA",
    });
    expect(guess.timeZone).toBe("UTC");
  });

  it("leaves unknown headers unmapped", () => {
    expect(guessMapping("CSV", 1, ["x", "y"]).columns).toEqual({});
  });
});
