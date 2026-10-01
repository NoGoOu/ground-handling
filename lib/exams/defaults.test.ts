import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_MULTIPLE_SCORING, DEFAULT_OJT_REQUIREMENT } from "@/lib/exams/defaults";

// The placeholders of the 10. mérföldkő are parameters: the database defaults
// of a new training and exam sheet must be the values kept in code.

const schema = readFileSync("prisma/schema.prisma", "utf8");
const defaultOf = (field: string) => schema.match(new RegExp(`\\b${field}\\s+\\w+\\s+@default\\((\\w+)\\)`))?.[1];

describe("the placeholder defaults", () => {
  it("are the defaults of the database", () => {
    expect(defaultOf("ojtRequiredCount")).toBe(String(DEFAULT_OJT_REQUIREMENT.requiredCount));
    expect(defaultOf("ojtMinCompletenessPercent")).toBe(String(DEFAULT_OJT_REQUIREMENT.minCompletenessPercent));
    expect(defaultOf("ojtMinOnTimePercent")).toBe(String(DEFAULT_OJT_REQUIREMENT.minOnTimePercent));
    expect(defaultOf("multipleScoring")).toBe(DEFAULT_MULTIPLE_SCORING);
  });

  it("are the placeholders of CLAUDE.md", () => {
    expect(DEFAULT_OJT_REQUIREMENT).toEqual({ requiredCount: 10, minCompletenessPercent: 100, minOnTimePercent: 0 });
  });
});
