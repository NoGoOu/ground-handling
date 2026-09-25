import { defaultValidUntil } from "@/lib/qualifications";

// Training records and their files (CLAUDE.md, 6. mérföldkő). Pure rules; the
// data layer stores what they decide.

export interface TrainingRule {
  hasExam: boolean;
  /** The pass mark in percent when there is an exam. */
  passPercent: number | null;
  /** The months of the qualification the training gives; undefined when it gives none, null when it does not expire. */
  validityMonths: number | null | undefined;
}

export interface RecordInput {
  completedOn: string;
  examPercent: number | null;
  /** Set by the coordinator; only counts without an exam. */
  passed: boolean;
  /** Only counts when set by hand. */
  validUntil: string | null;
  validUntilManual: boolean;
}

export type RecordProblem = "examRequired" | "noExam";

/**
 * What a record stores: with an exam the result decides whether it passed,
 * without one the coordinator does; the end of validity is the completion day
 * + the qualification's months unless set by hand. A training without a
 * qualification gives no validity.
 */
export function resolveRecord(
  rule: TrainingRule,
  input: RecordInput,
): { passed: boolean; examPercent: number | null; validUntil: string | null; validUntilManual: boolean } | RecordProblem {
  if (rule.hasExam && input.examPercent === null) return "examRequired";
  if (!rule.hasExam && input.examPercent !== null) return "noExam";
  const passed = rule.hasExam ? input.examPercent! >= (rule.passPercent ?? 0) : input.passed;
  if (rule.validityMonths === undefined) {
    return { passed, examPercent: input.examPercent, validUntil: null, validUntilManual: false };
  }
  const manual = input.validUntilManual;
  return {
    passed,
    examPercent: input.examPercent,
    validUntil: manual ? input.validUntil : defaultValidUntil(input.completedOn, rule.validityMonths),
    validUntilManual: manual,
  };
}

/** The file types a record takes (CLAUDE.md, "Fájlok"), known by their first bytes, not their name. */
export const UPLOAD_TYPES = {
  "application/pdf": { extension: "pdf", magic: [[0x25, 0x50, 0x44, 0x46, 0x2d]] },
  "image/png": { extension: "png", magic: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]] },
  "image/jpeg": { extension: "jpg", magic: [[0xff, 0xd8, 0xff]] },
} as const;

export type UploadType = keyof typeof UPLOAD_TYPES;

/** A placeholder limit (CLAUDE.md): 10 MB per file. */
export const MAX_TRAINING_FILE_BYTES = 10 * 1024 * 1024;

export function detectUploadType(bytes: Uint8Array): UploadType | null {
  for (const [type, { magic }] of Object.entries(UPLOAD_TYPES) as [UploadType, (typeof UPLOAD_TYPES)[UploadType]][]) {
    if (magic.some((signature) => signature.every((byte, i) => bytes[i] === byte))) return type;
  }
  return null;
}

export type UploadProblem = "empty" | "tooLarge" | "type";

export function checkUpload(bytes: Uint8Array): { type: UploadType } | { problem: UploadProblem } {
  if (bytes.byteLength === 0) return { problem: "empty" };
  if (bytes.byteLength > MAX_TRAINING_FILE_BYTES) return { problem: "tooLarge" };
  const type = detectUploadType(bytes);
  return type ? { type } : { problem: "type" };
}
