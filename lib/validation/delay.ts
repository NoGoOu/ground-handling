import { z } from "zod";
import { messages } from "@/lib/messages";
import { optionalTime } from "@/lib/validation/flight";

const e = messages.delay.errors;

// "Késés rögzítése": a new estimated arrival and/or departure with a note on
// its source (CLAUDE.md, "Késés és törlés").

export const DELAY_FIELDS = ["eta", "etd", "note"] as const;
export type DelayFormInput = Record<(typeof DELAY_FIELDS)[number], string>;

export const delaySchema = z
  .object({
    eta: optionalTime,
    etd: optionalTime,
    note: z.string().trim().max(200, e.note),
  })
  .refine((delay) => delay.eta || delay.etd, { path: ["eta"], message: e.nothing });

export type DelayData = z.output<typeof delaySchema>;

/** Which estimates the flight can take: only its existing, not cancelled parts. */
export function delayPartErrors(
  delay: Pick<DelayData, "eta" | "etd">,
  flight: { sta: Date | null; std: Date | null; arrivalCancelled: boolean; departureCancelled: boolean },
): Partial<Record<"eta" | "etd", string>> {
  const errors: Partial<Record<"eta" | "etd", string>> = {};
  if (delay.eta && !flight.sta) errors.eta = e.noArrival;
  else if (delay.eta && flight.arrivalCancelled) errors.eta = e.cancelled;
  if (delay.etd && !flight.std) errors.etd = e.noDeparture;
  else if (delay.etd && flight.departureCancelled) errors.etd = e.cancelled;
  return errors;
}
