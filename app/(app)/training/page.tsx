import Link from "next/link";
import { messages } from "@/lib/messages";
import { canManageTraining, canViewTraining, canViewTrainingOf, trainingVisibleUserIds } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";

const t = messages.training;

/** Training data (6. mérföldkő): what the user may open. */
export default async function TrainingPage() {
  const user = await requireCapability(canViewTraining);
  const h = t.hub;
  const visible = trainingVisibleUserIds(user);
  // Everyone sees their own data (an agent is a team member); a team leader the
  // team; the coordinator and the admin everyone.
  const own = !!user.teamId && canViewTrainingOf(user, user.id);
  const everyone = visible === null;
  const team = !everyone && (visible?.length ?? 0) > 1;
  const sections = [
    ...(own ? [{ href: "/training/me", title: h.mine, hint: h.mineHint }] : []),
    ...(team ? [{ href: "/training/team", title: h.team, hint: h.teamHint }] : []),
    ...(everyone
      ? [
          { href: "/training/people", title: h.people, hint: h.peopleHint },
          { href: "/training/team", title: t.team.title, hint: t.team.intro },
        ]
      : []),
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
