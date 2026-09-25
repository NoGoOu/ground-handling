import Link from "next/link";
import { listTrainingPeople } from "@/lib/data/training";
import { messages } from "@/lib/messages";
import { canViewTraining, trainingVisibleUserIds } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";

const t = messages.training;

/** The people whose training data the viewer may see (CLAUDE.md, 6. mérföldkő). */
export default async function PeoplePage() {
  const user = await requireCapability(canViewTraining);
  const people = await listTrainingPeople(trainingVisibleUserIds(user));
  const p = t.people;
  return (
    <div className="flex flex-col gap-4">
      <Link href="/training" className="self-start text-sm text-sky-700 hover:underline">
        {t.back}
      </Link>
      <h1 className="text-2xl font-bold">{p.title}</h1>
      {people.length === 0 ? (
        <p className="text-neutral-600">{p.empty}</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((person) => (
            <li key={person.id}>
              <Link
                href={`/training/people/${person.id}`}
                className={`flex flex-col rounded-lg border border-neutral-200 bg-white px-4 py-3 hover:bg-sky-50 ${person.active ? "" : "opacity-60"}`}
              >
                <span className="font-medium text-sky-700">{person.name}</span>
                <span className="text-xs text-neutral-500">
                  {p.team}: {person.team?.name ?? p.noTeam}
                  {!person.active && ` · ${t.person.inactive}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
