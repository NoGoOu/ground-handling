import Link from "next/link";
import { listOpenAttemptsOf } from "@/lib/data/attempts";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canManageTraining, canViewTraining, canViewTrainingOf } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { formatDateTime, toLocalDate } from "@/lib/time";
import { PersonTraining } from "../person-view";

const t = messages.training;

/** The agent's own qualifications and trainings (CLAUDE.md, 6. mérföldkő), readable on a phone. */
export default async function MyTrainingPage() {
  const user = await requireCapability((u) => canViewTraining(u) && canViewTrainingOf(u, u.id));
  const [{ expiryWarningDays }, openAttempts] = await Promise.all([getSettings(), listOpenAttemptsOf(user.id)]);
  const a = messages.attempts;
  return (
    <div className="flex flex-col gap-4">
      <Link href="/training" className="self-start text-sm text-sky-700 hover:underline">
        {t.back}
      </Link>
      <h1 className="text-2xl font-bold">{t.person.mineTitle}</h1>
      {/* The e-exams opened for the agent (10. mérföldkő). */}
      {openAttempts.length > 0 && (
        <section className="flex flex-col gap-2 rounded-xl border-2 border-sky-300 bg-sky-50 p-4">
          <h2 className="font-semibold text-sky-900">{a.myOpenTitle}</h2>
          <p className="text-sm text-sky-900">{a.myOpenHint}</p>
          <ul className="flex flex-col gap-2">
            {openAttempts.map((attempt) => (
              <li key={attempt.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex flex-col">
                  <span className="font-medium">{fmt(a.heading, { sheet: attempt.sheet.name, training: attempt.process.training.name })}</span>
                  {attempt.deadline && <span className="text-sm text-neutral-600">{fmt(a.deadline, { time: formatDateTime(attempt.deadline) })}</span>}
                </span>
                <Link href={`/training/exam/${attempt.id}`} className="btn btn-primary btn-lg">
                  {a.fill}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <PersonTraining
        userId={user.id}
        today={toLocalDate(new Date())}
        warningDays={expiryWarningDays}
        canEdit={canManageTraining(user)}
      />
    </div>
  );
}
