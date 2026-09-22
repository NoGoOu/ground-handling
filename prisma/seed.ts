import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { SETTINGS_ID } from "@/lib/settings";
import { templateSnapshotJson } from "@/lib/snapshot";
import { toLocalDate } from "@/lib/time";
import {
  buildSeedFlights,
  buildSeedShifts,
  DEMO_PASSWORD,
  SEED_AIRLINE,
  SEED_MILESTONES,
  SEED_TEMPLATE,
  SEED_USERS,
} from "./seed-data";

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
    await tx.milestoneRecord.deleteMany();
    await tx.task.deleteMany();
    await tx.flight.deleteMany();
    await tx.milestoneDefinition.deleteMany();
    await tx.turnaroundTemplate.deleteMany();
    await tx.airline.deleteMany();
    await tx.user.deleteMany();

    const users = new Map<string, string>();
    for (const user of SEED_USERS) {
      const created = await tx.user.create({ data: { ...user, passwordHash } });
      users.set(user.username, created.id);
    }
    const userId = (username: string | null) => (username ? users.get(username)! : null);

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

    for (const shift of buildSeedShifts(localDate)) {
      const { agent, ...shiftData } = shift;
      await tx.shift.create({ data: { ...shiftData, userId: userId(agent)! } });
    }

    for (const flight of buildSeedFlights(localDate)) {
      const { status, arrivalAgent, departureAgent, records, ...flightData } = flight;
      await tx.flight.create({
        data: {
          ...flightData,
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
