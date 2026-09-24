import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { headerFingerprint } from "@/lib/import/fingerprint";
import { NETLINE_MAPPING, NETLINE_SAMPLE, netlineTable } from "@/lib/import/netline.fixture";
import { matchProfile, type StoredProfile } from "@/lib/import/profiles";
import { readFile } from "@/lib/import/read";

const file = readFile("sample.xlsx", readFileSync(NETLINE_SAMPLE));
const netline: StoredProfile = {
  id: "p1",
  name: "Ryanair NetLine",
  headerFingerprint: headerFingerprint(netlineTable().headers),
  mapping: NETLINE_MAPPING,
};

describe("offering a profile", () => {
  it("offers the profile made for the same header", () => {
    expect(matchProfile(file, [netline])).toBe(netline);
  });

  it("skips a profile of another header, sheet or header row", () => {
    const otherHeader = { ...netline, id: "p2", headerFingerprint: headerFingerprint(["Al", "FlNo"]) };
    const otherSheet = { ...netline, id: "p3", mapping: { ...NETLINE_MAPPING, sheet: "Flights" } };
    const otherRow = { ...netline, id: "p4", mapping: { ...NETLINE_MAPPING, headerRow: 2 } };
    expect(matchProfile(file, [otherHeader, otherSheet, otherRow])).toBeNull();
    expect(matchProfile(file, [otherHeader, netline])).toBe(netline);
  });
});
