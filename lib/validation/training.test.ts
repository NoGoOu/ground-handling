import { describe, expect, it } from "vitest";
import { messages } from "@/lib/messages";
import { fieldErrors } from "@/lib/validation/form";
import { courseSchema, qualificationSchema, recordSchema } from "@/lib/validation/training";

const t = messages.training;
const errors = (result: { success: boolean; error?: unknown }) =>
  result.success ? {} : fieldErrors(result.error as Parameters<typeof fieldErrors>[0]);

describe("training forms", () => {
  it("take a qualification with or without an expiry", () => {
    expect(qualificationSchema.parse({ name: "PRM", code: "prm", validityMonths: "24", active: "on" })).toEqual({
      name: "PRM",
      code: "PRM",
      validityMonths: 24,
      active: true,
    });
    expect(qualificationSchema.parse({ name: "Altéa", code: "ALT", validityMonths: "", active: "" }).validityMonths).toBeNull();
    expect(errors(qualificationSchema.safeParse({ name: "", code: "a b", validityMonths: "0", active: "" }))).toEqual({
      name: t.qualifications.errors.name,
      code: t.qualifications.errors.code,
      validityMonths: t.qualifications.errors.months,
    });
  });

  it("need a pass mark for a training with an exam, and drop it without one", () => {
    expect(errors(courseSchema.safeParse({ name: "X", qualificationId: "", hasExam: "on", passPercent: "" }))).toEqual({
      passPercent: t.courses.errors.passPercent,
    });
    expect(courseSchema.parse({ name: "X", qualificationId: "q", hasExam: "", passPercent: "80" })).toEqual({
      name: "X",
      qualificationId: "q",
      hasExam: false,
      passPercent: null,
    });
  });

  it("read a record", () => {
    expect(
      recordSchema.parse({
        userId: "u",
        trainingId: "t",
        completedOn: "2026-03-15",
        examPercent: "85",
        passed: "",
        validUntil: "",
        validUntilManual: "",
        note: " ",
      }),
    ).toEqual({
      userId: "u",
      trainingId: "t",
      completedOn: "2026-03-15",
      examPercent: 85,
      passed: false,
      validUntil: null,
      validUntilManual: false,
      note: null,
    });
    const bad = recordSchema.safeParse({
      userId: "",
      trainingId: "t",
      completedOn: "2026-02-30",
      examPercent: "101",
      passed: "",
      validUntil: "x",
      validUntilManual: "",
      note: "",
    });
    expect(Object.keys(errors(bad)).sort()).toEqual(["completedOn", "examPercent", "userId", "validUntil"]);
  });
});
