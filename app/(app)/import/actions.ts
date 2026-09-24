"use server";

import { redirect } from "next/navigation";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import { loadUploadTable, saveProfile, saveUpload } from "@/lib/data/imports";
import { headerFingerprint } from "@/lib/import/fingerprint";
import { describeProblem } from "@/lib/import/describe";
import { mappingProblems } from "@/lib/import/mapping";
import { detectFormat, MAX_UPLOAD_BYTES, readFile, ReadError } from "@/lib/import/read";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canImportSchedule } from "@/lib/permissions";
import { parseMappingJson, profileNameSchema } from "@/lib/validation/import";

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
