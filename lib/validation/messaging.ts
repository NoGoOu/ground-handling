import { z } from "zod";
import { messages } from "@/lib/messages";

// The address book and the sender (CLAUDE.md, 7. mérföldkő): an email
// address or a SITA Type B address of 7 characters.

const e = messages.addressBook.errors;

export const TYPE_B_ADDRESS = /^[A-Z0-9]{7}$/;

/** The types an airline may get from us. */
export const ADDRESS_BOOK_TYPES = ["MVT", "LDM", "CPM", "UCM"] as const;

export const ADDRESS_FIELDS = ["airlineId", "messageType", "channel", "address"] as const;
export type AddressFormInput = Record<(typeof ADDRESS_FIELDS)[number], string>;

export const addressSchema = z
  .object({
    airlineId: z.string().min(1, e.airline),
    messageType: z.enum(ADDRESS_BOOK_TYPES, { message: e.messageType }),
    channel: z.enum(["EMAIL", "SITA"], { message: e.channel }),
    address: z.string().trim(),
  })
  .transform((value) => ({ ...value, address: value.channel === "SITA" ? value.address.toUpperCase() : value.address.toLowerCase() }))
  .superRefine((value, ctx) => {
    const ok = value.channel === "SITA" ? TYPE_B_ADDRESS.test(value.address) : z.email().safeParse(value.address).success;
    if (!ok) ctx.addIssue({ code: "custom", path: ["address"], message: value.channel === "SITA" ? e.typeB : e.email });
  });

export const SENDER_FIELDS = ["senderEmail", "senderTypeB"] as const;
export type SenderFormInput = Record<(typeof SENDER_FIELDS)[number], string>;

export const senderSchema = z.object({
  senderEmail: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => value || null)
    .pipe(z.email(e.email).nullable()),
  senderTypeB: z
    .string()
    .trim()
    .toUpperCase()
    .transform((value) => value || null)
    .pipe(z.string().regex(TYPE_B_ADDRESS, e.typeB).nullable()),
});

// Airports and the slot tolerance (8. mérföldkő).

const ea = messages.airports.errors;

export const AIRPORT_FIELDS = ["iataCode", "icaoCode", "name"] as const;
export type AirportFormInput = Record<(typeof AIRPORT_FIELDS)[number], string>;

export const airportSchema = z.object({
  iataCode: z.string().trim().toUpperCase().pipe(z.string().regex(/^[A-Z]{3}$/, ea.iata)),
  icaoCode: z.string().trim().toUpperCase().pipe(z.string().regex(/^[A-Z]{4}$/, ea.icao)),
  name: z.string().trim().min(1, ea.name).max(100, ea.name),
});

export const slotToleranceSchema = z.object({
  slotToleranceMinutes: z
    .string()
    .trim()
    .regex(/^\d{1,3}$/, messages.slotTolerance.error)
    .transform(Number)
    .pipe(z.number().int().min(0, messages.slotTolerance.error).max(240, messages.slotTolerance.error)),
});
