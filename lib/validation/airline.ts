import { z } from "zod";
import { messages } from "@/lib/messages";

const e = messages.airlineForm.errors;

export const AIRLINE_FIELDS = ["name", "iataCode"] as const;
export type AirlineFormInput = Record<(typeof AIRLINE_FIELDS)[number], string>;

export const airlineSchema = z.object({
  name: z.string().trim().min(1, e.name).max(100, e.name),
  iataCode: z
    .string()
    .trim()
    .toUpperCase()
    .pipe(z.string().regex(/^[A-Z0-9]{2}$/, e.iataCode)),
});
