import Link from "next/link";
import { ProcessSummary } from "@/components/process-summary";
import { listOpenAttemptsOf } from "@/lib/data/attempts";
import { listProcesses } from "@/lib/data/processes";
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
  const [{ expiryWarningDays }, openAttempts, processes] = await Promise.all([
    getSettings(),
    listOpenAttemptsOf(user.id),
    listProcesses([user.id]),
  ]);
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
      {/* The agent's training processes (10. mérföldkő). */}
      {processes.length > 0 && (
        <section className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="font-semibold">{messages.processes.mineTitle}</h2>
          <ul className="flex flex-col divide-y divide-neutral-100">
            {processes.map((process) => (
              <li key={process.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="flex flex-col gap-1">
                  <span className="font-medium">{process.training.name}</span>
                  <ProcessSummary process={process} />
                </span>
                <Link href={`/training/processes/${process.id}`} className="text-sky-700 hover:underline">
                  {messages.processes.open}
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
