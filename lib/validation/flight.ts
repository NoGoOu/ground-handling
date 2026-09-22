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

const flightNumber = z
  .string()
  .transform((value) => value.replace(/\s+/g, "").toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9]{2,10}$/, e.flightNumber));

const requiredTime = z.string().transform((value, ctx) => {
  const time = parseLocalDateTime(value);
  if (!time) {
    ctx.addIssue({ code: "custom", message: e.time });
    return z.NEVER;
  }
  return time;
});

const optionalTime = z.string().transform((value, ctx) => {
  if (value.trim() === "") return null;
  const time = parseLocalDateTime(value);
  if (!time) {
    ctx.addIssue({ code: "custom", message: e.time });
    return z.NEVER;
  }
  return time;
});

export const flightSchema = z
  .object({
    templateId: z.string().min(1, e.template),
    inboundFlightNumber: flightNumber,
    outboundFlightNumber: flightNumber,
    stand: z.string().trim().min(1, e.stand).max(10, e.stand),
    sta: requiredTime,
    eta: optionalTime,
    std: requiredTime,
    etd: optionalTime,
  })
  // Provisional decision 6.
  .refine((f) => f.std.getTime() > f.sta.getTime(), { path: ["std"], message: e.stdBeforeSta });

export type FlightData = z.output<typeof flightSchema>;
