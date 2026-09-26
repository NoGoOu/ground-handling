import { z } from "zod";
import { messages } from "@/lib/messages";
import { normaliseRegistration } from "@/lib/flight";
import { parseLocalDate, parseLocalDateTime, toLocalDate } from "@/lib/time";

const e = messages.flightForm.errors;

// ETA and ETD are not here: they change only through "Késés rögzítése", so
// every change has a source, a note, and who and when (see lib/validation/delay.ts).
export const FLIGHT_FIELDS = [
  "airlineId",
  "inboundFlightNumber",
  "outboundFlightNumber",
  "stand",
  "sta",
  "std",
  // 7. mérföldkő: what messages are matched by.
  "origin",
  "destination",
  "arrivalRegistration",
  "departureRegistration",
  "arrivalFlightDate",
  "departureFlightDate",
] as const;

/** What messages are matched by (7. mérföldkő); optional in the input. */
type MatchField =
  | "origin"
  | "destination"
  | "arrivalRegistration"
  | "departureRegistration"
  | "arrivalFlightDate"
  | "departureFlightDate";

export type FlightFormInput = Record<Exclude<(typeof FLIGHT_FIELDS)[number], MatchField>, string> &
  Partial<Record<MatchField, string>>;

/** An empty field is a missing part (rule 11), not an error. */
const optionalFlightNumber = z
  .string()
  .transform((value) => value.replace(/\s+/g, "").toUpperCase())
  .pipe(z.string().regex(/^([A-Z0-9]{2,10})?$/, e.flightNumber))
  .transform((value) => value || null);

export const optionalTime = z.string().transform((value, ctx) => {
  if (value.trim() === "") return null;
  const time = parseLocalDateTime(value);
  if (!time) {
    ctx.addIssue({ code: "custom", message: e.time });
    return z.NEVER;
  }
  return time;
});

const optionalStation = z
  .string()
  .default("")
  .transform((value) => value.trim().toUpperCase())
  .pipe(z.string().regex(/^([A-Z]{3})?$/, e.station))
  .transform((value) => value || null);

const optionalRegistration = z
  .string()
  .default("")
  .transform((value) => normaliseRegistration(value))
  .pipe(z.string().max(10, e.registration).nullable());

const optionalDay = z
  .string()
  .default("")
  .transform((value, ctx) => {
    if (value.trim() === "") return null;
    if (!parseLocalDate(value.trim())) {
      ctx.addIssue({ code: "custom", message: e.flightDate });
      return z.NEVER;
    }
    return value.trim();
  });

/** "YYYY-MM-DD" as stored in a date column. */
const dateValue = (day: string) => new Date(`${day}T00:00:00Z`);

/**
 * A flight has an arrival part (flight number, STA), a departure part (flight
 * number, STD), or both (rule 11 and decision 6).
 */
export const flightSchema = z
  .object({
    // The tasks and their templates come from the airline's task types (5. mérföldkő).
    airlineId: z.string().min(1, e.airline),
    inboundFlightNumber: optionalFlightNumber,
    outboundFlightNumber: optionalFlightNumber,
    // The stand can wait: an imported flight has none until the shift lead sets it.
    stand: z
      .string()
      .trim()
      .max(10, e.stand)
      .transform((value) => value || null),
    sta: optionalTime,
    std: optionalTime,
    origin: optionalStation,
    destination: optionalStation,
    arrivalRegistration: optionalRegistration,
    departureRegistration: optionalRegistration,
    arrivalFlightDate: optionalDay,
    departureFlightDate: optionalDay,
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

    // Decision 6: only when both parts exist.
    if (f.sta && f.std && f.std.getTime() <= f.sta.getTime()) issue("std", e.stdBeforeSta);
  })
  // A missing part has none of these. The operating day defaults to the day
  // of the scheduled time in Budapest (approved decision of the 7. mérföldkő).
  .transform((f) => ({
    ...f,
    origin: f.sta ? f.origin : null,
    arrivalRegistration: f.sta ? f.arrivalRegistration : null,
    arrivalFlightDate: f.sta ? dateValue(f.arrivalFlightDate ?? toLocalDate(f.sta)) : null,
    destination: f.std ? f.destination : null,
    departureRegistration: f.std ? f.departureRegistration : null,
    departureFlightDate: f.std ? dateValue(f.departureFlightDate ?? toLocalDate(f.std)) : null,
  }));

export type FlightData = z.output<typeof flightSchema>;
