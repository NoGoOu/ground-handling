import { usableOn, type QualificationRecord } from "@/lib/qualifications";

// Who may mentor and who may examine (CLAUDE.md, 10. mérföldkő, "Mentor és
// vizsgáztató"): the permission, and the training's qualification valid on the
// day of the practice or the exam. A training that gives no qualification needs
// the permission only, and so does one whose qualification is inactive, since
// the checks pass over inactive qualifications (rule 33).

export type EligibilityProblem = "permission" | "qualification";

export function eligibility(
  hasPermission: boolean,
  qualification: { id: string; active: boolean } | null,
  records: readonly QualificationRecord[],
  day: string,
): EligibilityProblem | null {
  if (!hasPermission) return "permission";
  if (qualification?.active && !usableOn(records, day).has(qualification.id)) return "qualification";
  return null;
}
