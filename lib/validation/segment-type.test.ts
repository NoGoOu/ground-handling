import { describe, expect, it } from "vitest";
import { segmentTypeSchema } from "@/lib/validation/segment-type";

const base = { name: "Oktatás", code: "trn", operative: false, active: true };

describe("segment type validation", () => {
  it("trims the name and upper-cases the code", () => {
    expect(segmentTypeSchema.parse({ ...base, name: "  Oktatás  " })).toEqual({
      name: "Oktatás",
      code: "TRN",
      operative: false,
      active: true,
    });
  });

  it("accepts a code of two to ten upper-case characters, digits and underscores", () => {
    for (const code of ["SH", "TRN", "OFF_DAY", "A1234567_"]) {
      expect(segmentTypeSchema.safeParse({ ...base, code }).success, code).toBe(true);
    }
    for (const code of ["S", "A B", "TRÉNING", "TOOLONGCODE1"]) {
      expect(segmentTypeSchema.safeParse({ ...base, code }).success, code).toBe(false);
    }
  });

  it("requires a name of at most 60 characters", () => {
    expect(segmentTypeSchema.safeParse({ ...base, name: "  " }).success).toBe(false);
    expect(segmentTypeSchema.safeParse({ ...base, name: "x".repeat(61) }).success).toBe(false);
  });

  it("keeps the operative flag, which decides whether tasks may be assigned", () => {
    expect(segmentTypeSchema.parse({ ...base, operative: true }).operative).toBe(true);
    expect(segmentTypeSchema.parse(base).operative).toBe(false);
  });
});
