"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import { addFaultComment, closeFault, MAX_FAULT_PHOTOS, reportFault, takeFault } from "@/lib/data/faults";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canManageFaults, canReportFault } from "@/lib/permissions";
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

// Handling a fault (CLAUDE.md, 11. mérföldkő): with "Hibajegyek kezelése".

export async function takeFaultAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actionUser(canManageFaults);
    if (!(await takeFault(id, actor.id))) throw new ActionError(f.step);
    refresh();
  });
}

export async function closeFaultAction(id: string, _previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actionUser(canManageFaults);
    const resolution = formData.get("resolution");
    if (resolution !== "FIXED" && resolution !== "NOT_A_FAULT") throw new ActionError(f.resolution);
    if (!(await closeFault(id, actor.id, resolution, formData.get("restore") === "on"))) throw new ActionError(f.step);
    refresh();
  });
}

export async function addCommentAction(id: string, _previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actionUser(canManageFaults);
    const text = String(formData.get("text") ?? "").trim();
    if (text.length < 1 || text.length > 2000) throw new ActionError(f.comment);
    if (!(await addFaultComment(id, actor.id, text))) throw new ActionError(messages.errors.notFound);
    refresh();
  });
}
