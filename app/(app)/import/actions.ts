"use server";

import { redirect } from "next/navigation";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import { saveUpload } from "@/lib/data/imports";
import { detectFormat, MAX_UPLOAD_BYTES, readFile, ReadError } from "@/lib/import/read";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canImportSchedule } from "@/lib/permissions";

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
