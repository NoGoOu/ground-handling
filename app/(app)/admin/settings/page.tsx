import Link from "next/link";
import { messages } from "@/lib/messages";
import { canManageSettings } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { updateCalendarSettings, updateEquipmentExpirySettings, updateExpirySettings, updateSettings } from "./actions";
import { NumberSettingForm } from "./number-setting-form";
import { SettingsForm } from "./settings-form";

const t = messages.settingsForm;

export default async function SettingsPage() {
  await requireCapability(canManageSettings);
  const { deviationThresholds, expiryWarningDays, equipmentWarningDays, calendarRefreshMinutes } = await getSettings();

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
        <NumberSettingForm
          action={updateExpirySettings}
          name="expiryWarningDays"
          label={t.expiryDays}
          unit={t.daysUnit}
          hint={t.expiryHint}
          min={0}
          max={365}
          initial={String(expiryWarningDays)}
        />
      </section>
      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="text-lg font-semibold">{t.equipmentExpiryTitle}</h2>
        <NumberSettingForm
          action={updateEquipmentExpirySettings}
          name="equipmentWarningDays"
          label={t.expiryDays}
          unit={t.daysUnit}
          hint={t.equipmentExpiryHint}
          min={0}
          max={365}
          initial={String(equipmentWarningDays)}
        />
      </section>
      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="text-lg font-semibold">{t.calendarTitle}</h2>
        <NumberSettingForm
          action={updateCalendarSettings}
          name="calendarRefreshMinutes"
          label={t.calendarRefresh}
          unit={t.minutesUnit}
          hint={t.calendarHint}
          min={15}
          max={1440}
          initial={String(calendarRefreshMinutes)}
        />
      </section>
    </div>
  );
}
