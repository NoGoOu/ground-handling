import Link from "next/link";
import { messages } from "@/lib/messages";
import { canManageTraining, canViewTraining, canViewTrainingOf } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { toLocalDate } from "@/lib/time";
import { PersonTraining } from "../person-view";

const t = messages.training;

/** The agent's own qualifications and trainings (CLAUDE.md, 6. mérföldkő), readable on a phone. */
export default async function MyTrainingPage() {
  const user = await requireCapability((u) => canViewTraining(u) && canViewTrainingOf(u, u.id));
  const { expiryWarningDays } = await getSettings();
  return (
    <div className="flex flex-col gap-4">
      <Link href="/training" className="self-start text-sm text-sky-700 hover:underline">
        {t.back}
      </Link>
      <h1 className="text-2xl font-bold">{t.person.mineTitle}</h1>
      <PersonTraining
        userId={user.id}
        today={toLocalDate(new Date())}
        warningDays={expiryWarningDays}
        canEdit={canManageTraining(user)}
      />
    </div>
  );
}
