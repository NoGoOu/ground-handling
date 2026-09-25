import { prisma } from "@/lib/db";
import {
  agentQualifications,
  type AgentQualification,
  type QualificationInfo,
  type QualificationRecord,
} from "@/lib/qualifications";

// Data side of the training data (CLAUDE.md, 6. mérföldkő). The rules are pure
// (lib/qualifications, lib/training); this file loads and saves.

export const dayValue = (day: string) => new Date(`${day}T00:00:00Z`);
export const dayText = (date: Date) => date.toISOString().slice(0, 10);

export async function listQualifications(onlyActive = false): Promise<QualificationInfo[]> {
  return prisma.qualification.findMany({
    where: onlyActive ? { active: true } : {},
    select: { id: true, code: true, name: true, validityMonths: true, active: true },
    orderBy: { code: "asc" },
  });
}

export async function listCourses() {
  return prisma.training.findMany({
    include: { qualification: { select: { id: true, code: true, name: true, validityMonths: true, active: true } } },
    orderBy: { name: "asc" },
  });
}

/** The people who have training data: agents, the members of a team; the inactive ones too. */
export async function listTrainingPeople(userIds: readonly string[] | null) {
  return prisma.user.findMany({
    where: { teamId: { not: null }, ...(userIds ? { id: { in: [...userIds] } } : {}) },
    select: { id: true, name: true, active: true, team: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
}

const recordInclude = {
  user: { select: { id: true, name: true } },
  training: { include: { qualification: { select: { id: true, code: true, name: true, validityMonths: true } } } },
  createdBy: { select: { name: true } },
  updatedBy: { select: { name: true } },
  files: {
    include: { uploadedBy: { select: { name: true } }, removedBy: { select: { name: true } } },
    orderBy: { uploadedAt: "asc" },
  },
} as const;

/** Records, newest completion first; limited to the given people when not null. */
export async function listRecords(userIds: readonly string[] | null) {
  return prisma.trainingRecord.findMany({
    where: userIds ? { userId: { in: [...userIds] } } : {},
    include: recordInclude,
    orderBy: [{ completedOn: "desc" }, { createdAt: "desc" }],
  });
}

export async function getRecord(id: string) {
  return prisma.trainingRecord.findUnique({ where: { id }, include: recordInclude });
}

/** The records the qualification rules read, per person. */
export async function qualificationRecords(userIds: readonly string[] | null): Promise<Map<string, QualificationRecord[]>> {
  const rows = await prisma.trainingRecord.findMany({
    where: userIds ? { userId: { in: [...userIds] } } : {},
    select: {
      id: true,
      userId: true,
      completedOn: true,
      passed: true,
      validUntil: true,
      createdAt: true,
      training: { select: { qualificationId: true } },
    },
  });
  const byUser = new Map<string, QualificationRecord[]>();
  for (const row of rows) {
    const list = byUser.get(row.userId) ?? [];
    list.push({
      id: row.id,
      qualificationId: row.training.qualificationId,
      completedOn: dayText(row.completedOn),
      passed: row.passed,
      validUntil: row.validUntil ? dayText(row.validUntil) : null,
      createdAt: row.createdAt,
    });
    byUser.set(row.userId, list);
  }
  return byUser;
}

export interface PersonQualifications {
  person: { id: string; name: string; active: boolean; team: string | null };
  qualifications: Map<string, AgentQualification>;
}

/** Every person's active qualifications with their status on the day. */
export async function qualificationTable(
  userIds: readonly string[] | null,
  day: string,
  warningDays: number,
): Promise<{ qualifications: QualificationInfo[]; people: PersonQualifications[] }> {
  const [qualifications, people, records] = await Promise.all([
    listQualifications(true),
    listTrainingPeople(userIds),
    qualificationRecords(userIds),
  ]);
  return {
    qualifications,
    people: people.map((person) => ({
      person: { id: person.id, name: person.name, active: person.active, team: person.team?.name ?? null },
      qualifications: agentQualifications(records.get(person.id) ?? [], qualifications, day, warningDays),
    })),
  };
}

export interface ExpiringRow {
  person: { id: string; name: string };
  qualification: QualificationInfo;
  status: "EXPIRING" | "EXPIRED";
  validUntil: string;
}

/** Active qualifications whose latest pass expires soon or has expired, soonest first (approved decision 2). */
export async function listExpiring(userIds: readonly string[] | null, day: string, warningDays: number): Promise<ExpiringRow[]> {
  const { qualifications, people } = await qualificationTable(userIds, day, warningDays);
  const rows: ExpiringRow[] = [];
  for (const { person, qualifications: statuses } of people) {
    if (!person.active) continue;
    for (const qualification of qualifications) {
      const status = statuses.get(qualification.id);
      if (!status || !status.validUntil || (status.status !== "EXPIRING" && status.status !== "EXPIRED")) continue;
      rows.push({ person, qualification, status: status.status, validUntil: status.validUntil });
    }
  }
  return rows.sort((a, b) => a.validUntil.localeCompare(b.validUntil) || a.person.name.localeCompare(b.person.name, "hu"));
}
