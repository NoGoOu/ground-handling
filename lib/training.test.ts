import { describe, expect, it } from "vitest";
import { checkUpload, MAX_TRAINING_FILE_BYTES, resolveRecord, type RecordInput } from "@/lib/training";

const input = (overrides: Partial<RecordInput> = {}): RecordInput => ({
  completedOn: "2026-03-15",
  examPercent: null,
  passed: false,
  validUntil: null,
  validUntilManual: false,
  ...overrides,
});

describe("a training record", () => {
  const exam = { hasExam: true, passPercent: 80, validityMonths: 12 };

  it("passes by its exam result and the pass mark", () => {
    expect(resolveRecord(exam, input({ examPercent: 80 }))).toMatchObject({ passed: true });
    expect(resolveRecord(exam, input({ examPercent: 79, passed: true }))).toMatchObject({ passed: false });
  });

  it("needs a result with an exam, and takes none without one", () => {
    expect(resolveRecord(exam, input())).toBe("examRequired");
    expect(resolveRecord({ ...exam, hasExam: false, passPercent: null }, input({ examPercent: 90 }))).toBe("noExam");
  });

  it("passes as the coordinator says without an exam", () => {
    const noExam = { hasExam: false, passPercent: null, validityMonths: 24 };
    expect(resolveRecord(noExam, input({ passed: true }))).toMatchObject({ passed: true, validUntil: "2028-03-15" });
    expect(resolveRecord(noExam, input({ passed: false }))).toMatchObject({ passed: false });
  });

  it("is valid for the qualification's months unless set by hand", () => {
    expect(resolveRecord(exam, input({ examPercent: 90 }))).toMatchObject({ validUntil: "2027-03-15", validUntilManual: false });
    expect(
      resolveRecord(exam, input({ examPercent: 90, validUntil: "2026-12-31", validUntilManual: true })),
    ).toMatchObject({ validUntil: "2026-12-31", validUntilManual: true });
    expect(resolveRecord({ ...exam, validityMonths: null }, input({ examPercent: 90 }))).toMatchObject({ validUntil: null });
  });

  it("gives no validity when the training gives no qualification", () => {
    const course = { hasExam: false, passPercent: null, validityMonths: undefined };
    expect(resolveRecord(course, input({ passed: true, validUntil: "2030-01-01", validUntilManual: true }))).toEqual({
      passed: true,
      examPercent: null,
      validUntil: null,
      validUntilManual: false,
    });
  });
});

describe("an uploaded file", () => {
  const bytes = (...values: number[]) => new Uint8Array([...values, 0, 0, 0]);

  it("is known by its first bytes", () => {
    expect(checkUpload(bytes(0x25, 0x50, 0x44, 0x46, 0x2d))).toEqual({ type: "application/pdf" });
    expect(checkUpload(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toEqual({ type: "image/png" });
    expect(checkUpload(bytes(0xff, 0xd8, 0xff, 0xe0))).toEqual({ type: "image/jpeg" });
  });

  it("is refused when empty, too large or of another type", () => {
    expect(checkUpload(new Uint8Array())).toEqual({ problem: "empty" });
    expect(checkUpload(bytes(0x50, 0x4b, 0x03, 0x04))).toEqual({ problem: "type" });
    const large = new Uint8Array(MAX_TRAINING_FILE_BYTES + 1);
    large.set([0x25, 0x50, 0x44, 0x46, 0x2d]);
    expect(checkUpload(large)).toEqual({ problem: "tooLarge" });
  });
});
