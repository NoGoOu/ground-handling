import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canManageTraining, canViewTraining, canViewTrainingOf } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { toLocalDate } from "@/lib/time";
import { PersonTraining } from "../../person-view";

const t = messages.training;

/** One person's training data, within the viewer's scope (CLAUDE.md, 6. mérföldkő). */
export default async function PersonPage(props: PageProps<"/training/people/[userId]">) {
  const user = await requireCapability(canViewTraining);
  const { userId } = await props.params;
  // The same answer for a missing person and one out of scope.
  if (!canViewTrainingOf(user, userId)) notFound();
  const person = await prisma.user.findFirst({
    where: { id: userId, teamId: { not: null } },
    select: { id: true, name: true, active: true },
  });
  if (!person) notFound();
  const { expiryWarningDays } = await getSettings();
  return (
    <div className="flex flex-col gap-4">
      <Link href="/training/people" className="self-start text-sm text-sky-700 hover:underline">
        {t.back}
      </Link>
      <h1 className="text-2xl font-bold">
        {fmt(t.person.title, { name: person.name })}
        {!person.active && <span className="ml-2 text-base font-normal text-neutral-500">({t.person.inactive})</span>}
      </h1>
      <PersonTraining
        userId={person.id}
        today={toLocalDate(new Date())}
        warningDays={expiryWarningDays}
        canEdit={canManageTraining(user)}
      />
    </div>
  );
}
