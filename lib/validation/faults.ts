import { z } from "zod";
import { messages } from "@/lib/messages";

// The fault report form (CLAUDE.md, 11. mérföldkő, "Hibajegy"). The photos
// come apart, as files.

const f = messages.faults.errors;

export const FAULT_FIELDS = ["equipmentId", "description", "outOfService"] as const;
export type FaultFormInput = Record<(typeof FAULT_FIELDS)[number], string>;

export const faultSchema = z.object({
  equipmentId: z.string().trim().min(1, f.equipment),
  description: z.string().trim().min(1, f.description).max(2000, f.description),
  outOfService: z.string().transform((value) => value === "on"),
});

/** The files of the form that hold something: an empty file input sends an empty file. */
export function photosOf(formData: FormData, name = "photos"): File[] {
  return formData.getAll(name).filter((value): value is File => value instanceof File && value.size > 0);
}
