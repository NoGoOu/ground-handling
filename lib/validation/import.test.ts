import { describe, expect, it } from "vitest";
import { NETLINE_MAPPING } from "@/lib/import/netline.fixture";
import { parseMappingJson, profileNameSchema, rangeSchema } from "@/lib/validation/import";

describe("mapping from the browser", () => {
  it("accepts a mapping and drops empty columns", () => {
    const json = JSON.stringify({ ...NETLINE_MAPPING, columns: { ...NETLINE_MAPPING.columns, suffix: "" } });
    const mapping = parseMappingJson(json);
    expect(mapping?.columns.suffix).toBeUndefined();
    expect(mapping?.columns.flightNumber).toBe("FlNo");
  });

  it("rejects unknown fields, a bad time zone and broken JSON", () => {
    expect(parseMappingJson(JSON.stringify({ ...NETLINE_MAPPING, columns: { hacker: "x" } }))).toBeNull();
    expect(parseMappingJson(JSON.stringify({ ...NETLINE_MAPPING, timeZone: "CET" }))).toBeNull();
    expect(parseMappingJson("{")).toBeNull();
    expect(parseMappingJson(undefined)).toBeNull();
  });
});

describe("profile name and date range", () => {
  it("needs a short profile name", () => {
    expect(profileNameSchema.safeParse(" Ryanair NetLine ").data).toBe("Ryanair NetLine");
    expect(profileNameSchema.safeParse(" ").success).toBe(false);
    expect(profileNameSchema.safeParse("x".repeat(61)).success).toBe(false);
  });

  it("takes an open or a closed range, not a backwards one", () => {
    expect(rangeSchema.parse({ start: "", end: "" })).toEqual({ start: null, end: null });
    expect(rangeSchema.parse({ start: "2024-09-10", end: "2024-09-30" })).toEqual({
      start: "2024-09-10",
      end: "2024-09-30",
    });
    expect(rangeSchema.safeParse({ start: "2024-09-30", end: "2024-09-10" }).success).toBe(false);
    expect(rangeSchema.safeParse({ start: "tomorrow", end: "" }).success).toBe(false);
  });
});
