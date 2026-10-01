import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import type { StaffingDay } from "@/lib/staffing/day";
import { shortageOf, surplusOf, type StaffingBand } from "@/lib/staffing/roster";

// The words of the staffing views (CLAUDE.md, 9. mérföldkő, "Nézet"), kept
// apart from the components so that they can be tested.

const t = messages.staffing;

/** "−2 hiány", "+1 többlet" or "0"; a dash on a day without a roster. */
export function balanceText(day: Pick<StaffingDay, "hasRoster">, band: Pick<StaffingBand, "balance">): string {
  if (!day.hasRoster) return t.noBalance;
  if (band.balance < 0) return fmt(t.shortage, { n: shortageOf(band) });
  if (band.balance > 0) return fmt(t.surplus, { n: surplusOf(band) });
  return t.even;
}

/**
 * What the roster of the day is, when it is not simply the actual one: the
 * draft of a day not yet published (9. mérföldkő, utómunka), or why there is
 * nothing to set the demand against.
 */
export function rosterNote(day: Pick<StaffingDay, "rosterLayer" | "hasRoster">): string | null {
  if (day.rosterLayer === null) return t.unpublished;
  if (day.rosterLayer === "DRAFT") return day.hasRoster ? t.draftNote : t.draftEmpty;
  return day.hasRoster ? null : t.noRoster;
}
