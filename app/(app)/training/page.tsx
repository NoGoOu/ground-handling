import Link from "next/link";
import { messages } from "@/lib/messages";
import { canManageTraining, canViewTraining } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";

const t = messages.training;

/** Training data (6. mérföldkő): what the user may open. */
export default async function TrainingPage() {
  const user = await requireCapability(canViewTraining);
  const h = t.hub;
  const sections = [
    ...(canManageTraining(user)
      ? [
          { href: "/training/qualifications", title: h.qualifications, hint: h.qualificationsHint },
          { href: "/training/courses", title: h.courses, hint: h.coursesHint },
          { href: "/training/records", title: h.records, hint: h.recordsHint },
        ]
      : []),
    { href: "/training/expiring", title: h.expiring, hint: h.expiringHint },
  ];
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <ul className="grid gap-3 sm:grid-cols-2">
        {sections.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="flex h-full flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-4 hover:border-sky-300 hover:bg-sky-50"
            >
              <span className="text-lg font-semibold">{s.title}</span>
              <span className="text-sm text-neutral-600">{s.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
