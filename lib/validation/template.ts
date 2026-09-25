import { z } from "zod";
import { messages } from "@/lib/messages";
import {
  ATA_CODE,
  ATD_CODE,
  BOTH_PARTS,
  MAX_TEMPLATE_MINUTES,
  sortByOrder,
  type Anchor,
  type MilestoneDef,
  type Part,
  type TemplateParts,
} from "@/lib/turnaround";

// Template editing rules: CLAUDE.md "MilestoneDefinition" and decision 4.

const e = messages.templateForm.errors;

/** A whole number typed into a form field (an empty field is an error, not 0). */
function intField(min: number, max: number, message: string) {
  return z
    .string()
    .trim()
    .regex(/^-?\d+$/, message)
    .transform(Number)
    .pipe(z.number().min(min, message).max(max, message));
}

const minutes = intField(0, MAX_TEMPLATE_MINUTES, e.minutes);

export const TEMPLATE_FIELDS = [
  "name",
  "minTurnaroundMinutes",
  "travelMinutes",
  "postDepartureMinutes",
  "departureReportMinutes",
  "minBreakMinutes",
] as const;
export type TemplateFormInput = Record<(typeof TEMPLATE_FIELDS)[number], string>;

export const templateNameSchema = z.string().trim().min(1, e.name).max(100, e.name);

export const templateSchema = z.object({
  name: templateNameSchema,
  minTurnaroundMinutes: minutes,
  travelMinutes: minutes,
  postDepartureMinutes: minutes,
  departureReportMinutes: minutes,
  // "Nem lehet negatív" (CLAUDE.md).
  minBreakMinutes: minutes,
});

export const MILESTONE_FIELDS = ["code", "name", "anchor", "offsetMinutes", "required", "part"] as const;
export type MilestoneFormInput = Record<(typeof MILESTONE_FIELDS)[number], string>;

export const milestoneSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .pipe(z.string().regex(/^[A-Z0-9_]{2,40}$/, e.code)),
  name: z.string().trim().min(1, e.milestoneName).max(100, e.milestoneName),
  anchor: z.enum(["ARRIVAL", "DEPARTURE"], { error: e.anchor }),
  offsetMinutes: intField(-1440, 1440, e.offset),
  required: z.string().transform((value) => value === "on"),
  part: z.enum(["ARRIVAL_PART", "DEPARTURE_PART"], { error: e.part }),
});

export type MilestoneData = Omit<MilestoneDef, "id" | "order">;

/** The fixed settings of the two system milestones. */
export const LOCKED_MILESTONES: Record<string, Omit<MilestoneData, "code" | "name">> = {
  [ATA_CODE]: { anchor: "ARRIVAL", offsetMinutes: 0, required: true, part: "ARRIVAL_PART" },
  [ATD_CODE]: { anchor: "DEPARTURE", offsetMinutes: 0, required: true, part: "DEPARTURE_PART" },
};

export function isLockedCode(code: string): boolean {
  return code in LOCKED_MILESTONES;
}

type StructureItem = Pick<MilestoneDef, "order" | "code" | "anchor" | "offsetMinutes" | "required" | "part">;

/**
 * Checks a whole milestone list; returns an error message or null. Since the
 * task types (5. mérföldkő) a template may have one part only: ATA is required
 * with an arrival part, ATD with a departure part, and no milestone may belong
 * to a part the template does not have.
 */
export function templateStructureError(
  milestones: readonly StructureItem[],
  parts: TemplateParts = BOTH_PARTS,
): string | null {
  const sorted = sortByOrder(milestones);
  const codes = sorted.map((m) => m.code);
  if (new Set(codes).size !== codes.length) return e.codeTaken;
  const hasPart = (part: Part) => (part === "ARRIVAL_PART" ? parts.arrival : parts.departure);
  if (sorted.some((m) => !hasPart(m.part))) return e.partNotInTemplate;
  if ((parts.arrival && !codes.includes(ATA_CODE)) || (parts.departure && !codes.includes(ATD_CODE))) {
    return e.missingSystemMilestone;
  }
  for (const m of sorted) {
    const locked = LOCKED_MILESTONES[m.code];
    if (
      locked &&
      (m.anchor !== locked.anchor ||
        m.offsetMinutes !== locked.offsetMinutes ||
        m.required !== locked.required ||
        m.part !== locked.part)
    ) {
      return messages.templateForm.locked;
    }
  }
  if (parts.arrival && codes[0] !== ATA_CODE) return e.ataFirst;
  if (parts.departure && codes.at(-1) !== ATD_CODE) return e.atdLast;
  const firstDeparture = sorted.findIndex((m) => m.part === "DEPARTURE_PART");
  if (firstDeparture >= 0 && sorted.slice(firstDeparture).some((m) => m.part === "ARRIVAL_PART")) {
    return e.partOrder;
  }
  return null;
}

/** The parts a new template gets, as the create form offers them. */
export const TEMPLATE_PARTS = {
  BOTH: { arrival: true, departure: true },
  ARRIVAL: { arrival: true, departure: false },
  DEPARTURE: { arrival: false, departure: true },
} as const satisfies Record<string, TemplateParts>;

export type TemplatePartsChoice = keyof typeof TEMPLATE_PARTS;

export const templatePartsSchema = z.enum(["BOTH", "ARRIVAL", "DEPARTURE"], { error: e.templateParts });

/** Ids in their new order after moving one milestone up or down by one place. */
export function moveInOrder<T extends { id: string; order: number }>(
  milestones: readonly T[],
  id: string,
  direction: "up" | "down",
): string[] {
  const ids = sortByOrder(milestones).map((m) => m.id);
  const index = ids.indexOf(id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ids.length) return ids;
  [ids[index], ids[target]] = [ids[target], ids[index]];
  return ids;
}

/** Where a new milestone goes: at the end of its part, before ATD for the departure part. */
export function insertIndex(milestones: readonly Pick<MilestoneDef, "order" | "code" | "part">[], part: Part): number {
  const sorted = sortByOrder(milestones);
  if (part === "DEPARTURE_PART") {
    const atd = sorted.findIndex((m) => m.code === ATD_CODE);
    return atd >= 0 ? atd : sorted.length;
  }
  const lastArrival = sorted.findLastIndex((m) => m.part === "ARRIVAL_PART");
  return lastArrival + 1;
}

export type { Anchor, Part };
