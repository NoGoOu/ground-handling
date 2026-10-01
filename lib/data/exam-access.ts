import { qualificationRecords } from "@/lib/data/training";
import { eligibility, type EligibilityProblem } from "@/lib/exams/eligibility";
import { canExamine, type Actor } from "@/lib/permissions";
import { toLocalDate } from "@/lib/time";

// Whether the actor may judge an exam today (CLAUDE.md, 10. mérföldkő, "Mentor
// és vizsgáztató"): the examining permission and the training's
// qualification valid on the day of the exam (approved decision 5).

export async function examinerProblem(
  actor: Actor,
  qualification: { id: string; active: boolean } | null,
  day = toLocalDate(new Date()),
): Promise<EligibilityProblem | null> {
  if (!canExamine(actor)) return "permission";
  const records = (await qualificationRecords([actor.id])).get(actor.id) ?? [];
  return eligibility(true, qualification, records, day);
}
