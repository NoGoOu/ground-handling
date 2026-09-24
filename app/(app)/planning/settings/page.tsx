import Link from "next/link";
import { getPlanningSettings, listShiftSegmentTypes } from "@/lib/data/planning";
import { messages } from "@/lib/messages";
import { canPlan } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { updatePlanningSettings } from "./actions";
import { PlanningSettingsForm } from "./settings-form";

const t = messages.planning.settings;

export default async function PlanningSettingsPage() {
  await requireCapability(canPlan);
  const [{ settings, segmentTypeId }, segmentTypes] = await Promise.all([
    getPlanningSettings(),
    listShiftSegmentTypes(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/planning" className="self-start text-sm text-sky-700 hover:underline">
        {t.back}
      </Link>
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="max-w-3xl text-sm text-neutral-600">{t.intro}</p>
      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <PlanningSettingsForm
          action={updatePlanningSettings}
          segmentTypes={segmentTypes}
          initial={{
            minShiftMinutes: String(settings.minShiftMinutes),
            maxShiftMinutes: String(settings.maxShiftMinutes),
            breakMinutes: String(settings.breakMinutes),
            breakAfterMinutes: String(settings.breakAfterMinutes),
            restMinutes: String(settings.restMinutes),
            overlapMinutes: String(settings.overlapMinutes),
            extraPositions: String(settings.extraPositions),
            segmentTypeId: segmentTypeId ?? "",
          }}
        />
      </section>
    </div>
  );
}
