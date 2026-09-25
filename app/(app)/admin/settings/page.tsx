import Link from "next/link";
import { messages } from "@/lib/messages";
import { canManageSettings } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { updateExpirySettings, updateSettings } from "./actions";
import { ExpirySettingsForm } from "./expiry-form";
import { SettingsForm } from "./settings-form";

const t = messages.settingsForm;

export default async function SettingsPage() {
  await requireCapability(canManageSettings);
  const { deviationThresholds, expiryWarningDays } = await getSettings();

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin" className="self-start text-sm text-sky-700 hover:underline">
        {messages.admin.back}
      </Link>
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="text-lg font-semibold">{t.deviationTitle}</h2>
        <SettingsForm
          action={updateSettings}
          initial={{
            deviationGreenMaxMinutes: String(deviationThresholds.greenMax),
            deviationYellowMaxMinutes: String(deviationThresholds.yellowMax),
          }}
        />
      </section>
      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="text-lg font-semibold">{t.expiryTitle}</h2>
        <ExpirySettingsForm action={updateExpirySettings} initial={String(expiryWarningDays)} />
      </section>
    </div>
  );
}
