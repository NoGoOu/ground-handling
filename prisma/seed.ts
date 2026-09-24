import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { DEFAULT_ROLES } from "@/lib/permissions";
import { SETTINGS_ID } from "@/lib/settings";
import { templateSnapshotJson } from "@/lib/snapshot";
import { localDayRange, addDays, toLocalDate } from "@/lib/time";
import {
  buildSeedFlights,
  DEMO_PASSWORD,
  SEED_AIRLINE,
  SEED_MILESTONES,
  SEED_TEMPLATE,
  SEED_TEAM,
  SEED_USERS,
} from "./seed-data";
import {
  SEED_PUBLICATION_DAYS,
  SEED_SEGMENT_TYPES,
  SEED_SHIFTS,
  segmentTimes,
} from "./seed-roster";

// Usage: tsx prisma/seed.ts [--if-empty]
// Replaces all data with the demo data set for today (Europe/Budapest).
// With --if-empty it does nothing when the database already has users.

async function main() {
  if (process.argv.includes("--if-empty") && (await prisma.user.count()) > 0) {
    console.log("Seed skipped: the database already has data.");
    return;
  }

  const localDate = toLocalDate(new Date());
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await prisma.$transaction(async (tx) => {
    // Global settings: the defaults from the schema (decision 7).
    await tx.setting.upsert({ where: { id: SETTINGS_ID }, create: { id: SETTINGS_ID }, update: {} });

    await tx.shift.deleteMany();
    await tx.publication.deleteMany();
    await tx.segmentType.deleteMany();
    await tx.milestoneRecord.deleteMany();
    await tx.task.deleteMany();
    await tx.flight.deleteMany();
    await tx.milestoneDefinition.deleteMany();
    await tx.turnaroundTemplate.deleteMany();
    await tx.airline.deleteMany();
    await tx.team.deleteMany();
    await tx.user.deleteMany();
    await tx.role.deleteMany();

    // Roles carry the permissions; the default set keeps the known behaviour.
    const roleIds = new Map<string, string>();
    for (const role of DEFAULT_ROLES) {
      const created = await tx.role.create({
        data: {
          name: role.name,
          builtIn: role.builtIn,
          permissions: {
            create: Object.entries(role.permissions).map(([permission, scope]) => ({ permission, scope })),
          },
        },
      });
      roleIds.set(role.name, created.id);
    }

    const users = new Map<string, string>();
    for (const user of SEED_USERS) {
      const created = await tx.user.create({
        data: {
          username: user.username,
          name: user.name,
          passwordHash,
          roles: { create: user.roles.map((name) => ({ roleId: roleIds.get(name)! })) },
        },
      });
      users.set(user.username, created.id);
    }
    const userId = (username: string | null) => (username ? users.get(username)! : null);

    // Every agent belongs to a team, led by the shift lead.
    const team = await tx.team.create({
      data: { name: SEED_TEAM.name, leaderId: userId(SEED_TEAM.leader)! },
    });
    await tx.user.updateMany({
      where: { id: { in: SEED_USERS.filter((u) => u.agent).map((u) => userId(u.username)!) } },
      data: { teamId: team.id },
    });

    const airline = await tx.airline.create({ data: SEED_AIRLINE });
    const template = await tx.turnaroundTemplate.create({
      data: {
        ...SEED_TEMPLATE,
        airlineId: airline.id,
        milestones: { create: SEED_MILESTONES },
      },
      include: { milestones: true },
    });
    const milestoneId = new Map(template.milestones.map((m) => [m.code, m.id]));

    // Roster: segment types, one published period and the actual layer.
    const segmentTypeIds = new Map<string, string>();
    for (const type of SEED_SEGMENT_TYPES) {
      const created = await tx.segmentType.create({ data: type });
      segmentTypeIds.set(created.code, created.id);
    }

    const publication = await tx.publication.create({
      data: {
        startDate: localDayRange(localDate).start,
        endDate: localDayRange(addDays(localDate, SEED_PUBLICATION_DAYS - 1)).start,
        publishedById: userId("tervezo")!,
      },
    });

    for (const shift of SEED_SHIFTS) {
      for (const layer of shift.layers) {
        await tx.shift.create({
          data: {
            userId: userId(shift.agent)!,
            layer,
            publicationId: layer === "PUBLISHED" ? publication.id : null,
            note: shift.note ?? null,
            segments: {
              create: shift.segments.map((segment) => ({
                ...segmentTimes(localDate, segment),
                segmentTypeId: segmentTypeIds.get(segment.typeCode)!,
                location: segment.location ?? null,
                description: segment.description ?? null,
                createBlock: segment.createBlock ?? false,
                travelBeforeMinutes: segment.travelBeforeMinutes ?? 0,
                travelAfterMinutes: segment.travelAfterMinutes ?? 0,
              })),
            },
          },
        });
      }
    }

    for (const flight of buildSeedFlights(localDate)) {
      const { status, arrivalAgent, departureAgent, records, estimateNote, ...flightData } = flight;
      // Estimates come from "Késés rögzítése": source, note, who and when, and a log entry.
      const lead = userId("vezeto")!;
      const now = new Date();
      const estimate = (value: Date | null) =>
        value ? { source: "MANUAL" as const, note: estimateNote ?? null, by: lead, at: now } : null;
      const eta = estimate(flightData.eta);
      const etd = estimate(flightData.etd);
      await tx.flight.create({
        data: {
          ...flightData,
          etaSource: eta?.source,
          etaNote: eta?.note,
          etaRecordedById: eta?.by,
          etaRecordedAt: eta?.at,
          etdSource: etd?.source,
          etdNote: etd?.note,
          etdRecordedById: etd?.by,
          etdRecordedAt: etd?.at,
          events:
            eta || etd
              ? {
                  create: {
                    kind: "DELAY",
                    eta: flightData.eta,
                    etd: flightData.etd,
                    source: "MANUAL",
                    note: estimateNote ?? null,
                    createdById: lead,
                    createdAt: now,
                  },
                }
              : undefined,
          airlineId: airline.id,
          templateId: template.id,
          task: {
            create: {
              status,
              arrivalAgentId: userId(arrivalAgent),
              departureAgentId: userId(departureAgent),
              templateSnapshot: status === "COMPLETED" ? templateSnapshotJson(template) : undefined,
              records: {
                create: records.map((r) => ({
                  milestoneDefinitionId: milestoneId.get(r.code)!,
                  actualTime: r.time,
                  recordedById: userId(r.by)!,
                })),
              },
            },
          },
        },
      });
    }
  });

  console.log(`Seed done for ${localDate}. Users: ${SEED_USERS.map((u) => u.username).join(", ")} (password: ${DEMO_PASSWORD})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
