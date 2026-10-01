import { describe, expect, it } from "vitest";
import { failedKnockOuts, practicalVerdict, type CriterionResult } from "@/lib/exams/practical";

// Knock-out criteria of the practical exam (CLAUDE.md, 10. mérföldkő, utómunka).

const result = (text: string, verdict: "PASS" | "FAIL", knockOut?: boolean): CriterionResult => ({
  criterionId: text,
  text,
  verdict,
  note: null,
  ...(knockOut === undefined ? {} : { knockOut }),
});

describe("the verdict of a practical exam", () => {
  it("fails the exam when a knock-out criterion is not met, whatever the examiner chose", () => {
    const results = [result("Biztonság", "FAIL", true), result("Kommunikáció", "PASS", false)];
    expect(practicalVerdict(results, "PASS")).toEqual({ verdict: "FAIL", forced: true });
    expect(practicalVerdict(results, null)).toEqual({ verdict: "FAIL", forced: true });
    expect(failedKnockOuts(results).map((r) => r.text)).toEqual(["Biztonság"]);
  });

  it("leaves the verdict to the examiner when every knock-out criterion is met", () => {
    const results = [result("Biztonság", "PASS", true), result("Kommunikáció", "FAIL", false)];
    expect(practicalVerdict(results, "PASS")).toEqual({ verdict: "PASS", forced: false });
    expect(practicalVerdict(results, "FAIL")).toEqual({ verdict: "FAIL", forced: false });
    expect(practicalVerdict(results, null)).toEqual({ verdict: null, forced: false });
  });

  it("leaves it to the examiner without knock-out criteria, and on exams recorded before them", () => {
    expect(practicalVerdict([], "PASS")).toEqual({ verdict: "PASS", forced: false });
    expect(practicalVerdict([result("Régi szempont", "FAIL")], "PASS")).toEqual({ verdict: "PASS", forced: false });
  });
});
