import { messages } from "@/lib/messages";
import { canImportSchedule } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { uploadScheduleFile } from "./actions";
import { UploadForm } from "./upload-form";

const t = messages.import;

export default async function ImportPage() {
  await requireCapability(canImportSchedule);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="max-w-3xl text-sm text-neutral-600">{t.intro}</p>
      <section className="flex max-w-2xl flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{t.upload}</h2>
        <UploadForm action={uploadScheduleFile} />
      </section>
    </div>
  );
}
