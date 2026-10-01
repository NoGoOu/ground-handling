import type { OjtProgress } from "@/lib/exams/ojt";
import { defaultValidUntil } from "@/lib/qualifications";

// The training process (CLAUDE.md, 10. mérföldkő, "Képzési folyamat" and
// "Kibocsátás"): an agent goes through the parts the training prescribes; when
// every one is passed the process is ready for release, and the release makes
// the passed training record.

export interface TrainingParts {
  theoryPart: boolean;
  practicalPart: boolean;
}

/** A process can only be started for a training with at least one part. */
export const hasParts = (training: TrainingParts) => training.theoryPart || training.practicalPart;

export type PartState = "NOT_REQUIRED" | "PENDING" | "PASSED";

export interface ProcessParts {
  theory: PartState;
  ojt: PartState;
  practical: PartState;
}

export function processParts(
  training: TrainingParts,
  progress: { theoryPassed: boolean; ojt: Pick<OjtProgress, "met">; practicalPassed: boolean },
): ProcessParts {
  const state = (required: boolean, done: boolean): PartState => (!required ? "NOT_REQUIRED" : done ? "PASSED" : "PENDING");
  return {
    theory: state(training.theoryPart, progress.theoryPassed),
    ojt: state(training.practicalPart, progress.ojt.met),
    practical: state(training.practicalPart, progress.practicalPassed),
  };
}

export type ProcessState = "IN_PROGRESS" | "READY" | "RELEASED" | "ABORTED";

/** "Kibocsátható" is not stored: it is a running process whose every prescribed part is passed. */
export function processState(status: "IN_PROGRESS" | "RELEASED" | "ABORTED", parts: ProcessParts): ProcessState {
  if (status !== "IN_PROGRESS") return status;
  const states = [parts.theory, parts.ojt, parts.practical];
  const ready = states.some((state) => state !== "NOT_REQUIRED") && states.every((state) => state !== "PENDING");
  return ready ? "READY" : "IN_PROGRESS";
}

/**
 * The passed record the release makes: completed on the day of the release,
 * valid by the qualification, with the result of the latest passed e-exam.
 */
export function releaseRecord(
  training: { qualification: { validityMonths: number | null } | null },
  releasedOn: string,
  examPercent: number | null,
): { completedOn: string; examPercent: number | null; passed: true; validUntil: string | null } {
  return {
    completedOn: releasedOn,
    examPercent,
    passed: true,
    validUntil: training.qualification ? defaultValidUntil(releasedOn, training.qualification.validityMonths) : null,
  };
}

/** The result the record gets: of the latest passed attempt, by when it was handed in. */
export function latestPassedPercent(attempts: readonly { passed: boolean | null; percent: number | null; submittedAt: Date | null }[]): number | null {
  const passed = attempts.filter((attempt) => attempt.passed && attempt.submittedAt && attempt.percent !== null);
  passed.sort((a, b) => b.submittedAt!.getTime() - a.submittedAt!.getTime());
  return passed[0]?.percent ?? null;
}
