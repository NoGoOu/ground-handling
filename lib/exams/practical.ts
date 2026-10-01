// The verdict of a practical exam (CLAUDE.md, 10. mérföldkő, "Gyakorlati
// vizsga" and its follow-up): the examiner judges each criterion and gives the
// verdict, but a failed knock-out criterion fails the exam, and the examiner
// cannot turn that around.

export type Verdict = "PASS" | "FAIL";

/** One criterion as the exam keeps it: the text and the knock-out mark of then. */
export interface CriterionResult {
  criterionId: string;
  text: string;
  verdict: Verdict;
  note: string | null;
  /** Missing on the exams recorded before knock-out criteria existed: not a knock-out. */
  knockOut?: boolean;
}

/** The knock-out criteria that were not met. */
export function failedKnockOuts(results: readonly Pick<CriterionResult, "verdict" | "knockOut" | "text">[]) {
  return results.filter((result) => result.knockOut === true && result.verdict === "FAIL");
}

/**
 * The verdict of the exam: failed when a knock-out criterion was not met,
 * otherwise the examiner's (null while not given).
 */
export function practicalVerdict(
  results: readonly Pick<CriterionResult, "verdict" | "knockOut" | "text">[],
  chosen: Verdict | null,
): { verdict: Verdict | null; forced: boolean } {
  if (failedKnockOuts(results).length > 0) return { verdict: "FAIL", forced: true };
  return { verdict: chosen, forced: false };
}
