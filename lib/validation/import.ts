import { z } from "zod";
import { TARGET_FIELDS, type ImportMapping, type TargetField } from "@/lib/import/mapping";
import { messages } from "@/lib/messages";
import { parseLocalDate } from "@/lib/time";

const e = messages.import.errors;

// The mapping travels from the browser as JSON; it is checked here before a
// profile is saved or a dry run starts.

const columnsSchema = z
  .record(z.string(), z.string().max(200))
  .transform((columns, ctx) => {
    const result: Partial<Record<TargetField, string>> = {};
    for (const [field, column] of Object.entries(columns)) {
      if (!(TARGET_FIELDS as readonly string[]).includes(field)) {
        ctx.addIssue({ code: "custom", message: e.mapping });
        return z.NEVER;
      }
      if (column) result[field as TargetField] = column;
    }
    return result;
  });

export const mappingSchema = z.object({
  sheet: z.string().min(1).max(200),
  headerRow: z.number().int().min(1).max(1000),
  timeZone: z.enum(["UTC", "LOCAL"]),
  columns: columnsSchema,
}) satisfies z.ZodType<ImportMapping, unknown>;

/** Reads the mapping JSON of a form; null when it is not a valid mapping. */
export function parseMappingJson(text: unknown): ImportMapping | null {
  if (typeof text !== "string") return null;
  try {
    const parsed = mappingSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const profileNameSchema = z.string().trim().min(1, e.profileName).max(60, e.profileName);

const optionalDay = z
  .string()
  .trim()
  .refine((value) => value === "" || parseLocalDate(value) !== null, e.range)
  .transform((value) => value || null);

/** The import's date range; both ends optional, the start not after the end. */
export const rangeSchema = z
  .object({ start: optionalDay, end: optionalDay })
  .refine((range) => !range.start || !range.end || range.start <= range.end, { message: e.range, path: ["end"] });
