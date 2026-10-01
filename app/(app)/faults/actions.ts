"use server";

import { redirect } from "next/navigation";
import { reportFault, MAX_FAULT_PHOTOS } from "@/lib/data/faults";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canReportFault } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { FAULT_FIELDS, faultSchema, photosOf, type FaultFormInput } from "@/lib/validation/faults";
import { fieldErrors, formValues, type FormState } from "@/lib/validation/form";

// Reporting a fault (CLAUDE.md, 11. mérföldkő): anyone with "Hiba jelentése".

const f = messages.faults.errors;

export type FaultFormState = FormState<FaultFormInput>;

export async function reportFaultAction(_previous: FaultFormState, formData: FormData): Promise<FaultFormState> {
  const actor = await getCurrentUser();
  if (!actor || !canReportFault(actor)) return { message: messages.errors.forbidden };
  const values = formValues(formData, FAULT_FIELDS);
  const parsed = faultSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const reported = await reportFault(parsed.data, photosOf(formData), actor.id);
  if ("problem" in reported) {
    const { problem } = reported;
    if (problem === "equipment") return { errors: { equipmentId: f.equipment }, values };
    const message =
      problem === "tooManyPhotos" ? fmt(f.tooManyPhotos, { max: MAX_FAULT_PHOTOS }) : problem === "tooLarge" ? f.tooLarge : f.photo[problem.photo];
    return { message, values };
  }
  redirect(`/faults/${reported.id}?sent=1`);
}
