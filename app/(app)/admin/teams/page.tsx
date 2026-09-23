import Link from "next/link";
import { listTeams } from "@/lib/data/users";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { canManageTeams } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { createTeam, updateTeam } from "./actions";
import { NewTeamForm, TeamRowForm } from "./team-forms";

const t = messages.teamForm;

export default async function TeamsPage() {
  await requireCapability(canManageTeams);
  const [teams, people] = await Promise.all([
    listTeams(),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin" className="self-start text-sm text-sky-700 hover:underline">
        {messages.admin.back}
      </Link>
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="text-sm text-neutral-600">{t.membersHint}</p>

      <section className="flex flex-col gap-2 rounded-xl border border-dashed border-neutral-300 bg-white p-4">
        <h2 className="font-semibold">{t.newTeam}</h2>
        <NewTeamForm action={createTeam} people={people} />
      </section>

      {teams.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-600">{t.empty}</p>
      ) : (
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {teams.map((team) => (
            <TeamRowForm
              key={team.id}
              action={updateTeam.bind(null, team.id)}
              people={people}
              initial={{ name: team.name, leaderId: team.leader.id }}
              members={team.members.map((member) => member.name)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
