import { z } from "zod";
import { messages } from "@/lib/messages";
import { parseLocalDateTime } from "@/lib/time";

const e = messages.flightForm.errors;

export const FLIGHT_FIELDS = [
  "templateId",
  "inboundFlightNumber",
  "outboundFlightNumber",
  "stand",
  "sta",
  "eta",
  "std",
  "etd",
] as const;

export type FlightFormInput = Record<(typeof FLIGHT_FIELDS)[number], string>;

/** An empty field is a missing part (rule 11), not an error. */
const optionalFlightNumber = z
  .string()
  .transform((value) => value.replace(/\s+/g, "").toUpperCase())
  .pipe(z.string().regex(/^([A-Z0-9]{2,10})?$/, e.flightNumber))
  .transform((value) => value || null);

const optionalTime = z.string().transform((value, ctx) => {
  if (value.trim() === "") return null;
  const time = parseLocalDateTime(value);
  if (!time) {
    ctx.addIssue({ code: "custom", message: e.time });
    return z.NEVER;
  }
  return time;
});

/**
 * A flight has an arrival part (flight number, STA, ETA), a departure part
 * (flight number, STD, ETD), or both (rule 11 and decision 6).
 */
export const flightSchema = z
  .object({
    templateId: z.string().min(1, e.template),
    inboundFlightNumber: optionalFlightNumber,
    outboundFlightNumber: optionalFlightNumber,
    stand: z.string().trim().min(1, e.stand).max(10, e.stand),
    sta: optionalTime,
    eta: optionalTime,
    std: optionalTime,
    etd: optionalTime,
  })
  .superRefine((f, ctx) => {
    const issue = (path: keyof typeof f, message: string) => ctx.addIssue({ code: "custom", path: [path], message });

    const hasArrival = !!(f.inboundFlightNumber || f.sta);
    const hasDeparture = !!(f.outboundFlightNumber || f.std);
    if (!hasArrival && !hasDeparture) {
      issue("sta", e.noPart);
      issue("std", e.noPart);
      return;
    }

    if (hasArrival && !f.inboundFlightNumber) issue("inboundFlightNumber", e.arrivalIncomplete);
    if (hasArrival && !f.sta) issue("sta", e.arrivalIncomplete);
    if (hasDeparture && !f.outboundFlightNumber) issue("outboundFlightNumber", e.departureIncomplete);
    if (hasDeparture && !f.std) issue("std", e.departureIncomplete);
    if (f.eta && !f.sta) issue("eta", e.etaWithoutArrival);
    if (f.etd && !f.std) issue("etd", e.etdWithoutDeparture);

    // Decision 6: only when both parts exist.
    if (f.sta && f.std && f.std.getTime() <= f.sta.getTime()) issue("std", e.stdBeforeSta);
  });

export type FlightData = z.output<typeof flightSchema>;
