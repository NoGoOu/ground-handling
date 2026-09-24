"use server";

import { redirect } from "next/navigation";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import { loadAirlines, loadExistingFlights, loadUploadTable, saveProfile, saveUpload } from "@/lib/data/imports";
import { prisma } from "@/lib/db";
import { describeProblem } from "@/lib/import/describe";
import { diffImport, planPeriod } from "@/lib/import/diff";
import { dryRunView, type DryRunView } from "@/lib/import/dry-run-view";
import { headerFingerprint } from "@/lib/import/fingerprint";
import { mappingProblems } from "@/lib/import/mapping";
import { planImport } from "@/lib/import/pairing";
import { detectFormat, MAX_UPLOAD_BYTES, readFile, ReadError } from "@/lib/import/read";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canImportSchedule } from "@/lib/permissions";
import { getCurrentUser, type CurrentUser } from "@/lib/session";
import { addDays, localDayRange } from "@/lib/time";
import { parseMappingJson, profileNameSchema, rangeSchema } from "@/lib/validation/import";

const e = messages.import.errors;

/** Keeps the uploaded file for the next steps, once it has been read successfully. */
export async function uploadScheduleFile(_previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actionUser(canImportSchedule);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new ActionError(e.noFile);
    if (file.size > MAX_UPLOAD_BYTES) throw new ActionError(e.tooLarge);
    if (!detectFormat(file.name)) throw new ActionError(e.unknownFormat);

    const content = new Uint8Array(await file.arrayBuffer());
    try {
      readFile(file.name, content);
    } catch (error) {
      if (error instanceof ReadError) throw new ActionError(fmt(e.unreadable, { reason: error.message }));
      throw error;
    }

    const upload = await saveUpload(actor.id, file.name, content);
    redirect(`/import/${upload.id}`);
  });
}

/**
 * Saves the mapping as a profile under its name. The header fingerprint comes
 * from the uploaded file, so the profile is offered for files with this header.
 */
export async function saveImportProfile(
  uploadId: string,
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actionUser(canImportSchedule);
    const name = profileNameSchema.safeParse(formData.get("name") ?? "");
    if (!name.success) throw new ActionError(e.profileName);
    const mapping = parseMappingJson(formData.get("mapping"));
    if (!mapping) throw new ActionError(e.mapping);

    const loaded = await loadUploadTable(uploadId, actor.id, mapping.sheet, mapping.headerRow);
    if (!loaded) throw new ActionError(e.gone);
    const problems = mappingProblems(mapping, loaded.table.headers);
    if (problems.length > 0) throw new ActionError(fmt(e.mappingProblems, { problems: problems.map(describeProblem).join(" ") }));

    const profile = await saveProfile(actor.id, name.data, mapping, headerFingerprint(loaded.table.headers));
    // Back to the mapping with the saved profile loaded, and a word that it is saved.
    const query = new URLSearchParams({
      sheet: mapping.sheet,
      header: String(mapping.headerRow),
      profile: profile.id,
      saved: "1",
    });
    redirect(`/import/${uploadId}?${query}`);
  });
}

/** Dates beyond any schedule, for an open end of the range. */
const OPEN_START = "1900-01-01";
const OPEN_END = "2999-12-31";

/**
 * Everything a dry run and a save need, from the form: the mapping, the date
 * range, the profile, the file's table, the plan and its difference to the
 * database. Reads only.
 */
async function prepareImport(actor: CurrentUser, uploadId: string, formData: FormData) {
  const mapping = parseMappingJson(formData.get("mapping"));
  if (!mapping) return { error: e.mapping };
  const range = rangeSchema.safeParse({ start: formData.get("start") ?? "", end: formData.get("end") ?? "" });
  if (!range.success) return { error: e.range };
  const requestedProfile = String(formData.get("profileId") ?? "");
  const profile = requestedProfile
    ? await prisma.importProfile.findUnique({ where: { id: requestedProfile }, select: { id: true } })
    : null;

  const loaded = await loadUploadTable(uploadId, actor.id, mapping.sheet, mapping.headerRow);
  if (!loaded) return { error: e.gone };
  const problems = mappingProblems(mapping, loaded.table.headers);
  if (problems.length > 0) return { error: fmt(e.mappingProblems, { problems: problems.map(describeProblem).join(" ") }) };

  const { start, end } = range.data;
  const importRange = start || end ? { start: start ?? OPEN_START, end: end ?? OPEN_END } : undefined;
  const plan = planImport(loaded.table, mapping, importRange);

  // The days the file covers, inside the range: the missing check looks no further.
  const covered = planPeriod(plan, null);
  const period = covered && {
    start: start && start > covered.start ? start : covered.start,
    end: end && end < covered.end ? end : covered.end,
  };
  const existing = period
    ? await loadExistingFlights({
        start: localDayRange(addDays(period.start, -2)).start,
        end: localDayRange(addDays(period.end, 2)).end,
      })
    : [];
  const diff = diffImport({ plan, existing, airlines: await loadAirlines(), profileId: profile?.id ?? null, period });
  return { mapping, upload: loaded.upload, plan, diff, existing, period, profileId: profile?.id ?? null };
}

export interface DryRunState {
  error?: string;
  view?: DryRunView;
}

/** Próbafuttatás: what an import would do, and nothing written. */
export async function dryRunImport(uploadId: string, _previous: DryRunState, formData: FormData): Promise<DryRunState> {
  const actor = await getCurrentUser();
  if (!actor || !canImportSchedule(actor)) return { error: messages.errors.forbidden };
  const prepared = await prepareImport(actor, uploadId, formData);
  if ("error" in prepared) return { error: prepared.error };
  const { plan, diff, existing, period, profileId } = prepared;
  return { view: dryRunView({ plan, diff, existing, period, profileId }) };
}
