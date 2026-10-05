import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { BASE_TASK_TYPE } from "@/lib/data/task-types";
import { prisma } from "@/lib/db";
import { DEMO_MILESTONES, DEMO_TEMPLATE_PARAMS } from "@/lib/demo-template";
import { LOADTEST_AIRLINE, LOADTEST_TEAM, LOADTEST_USER_PREFIX } from "@/lib/ops/loadtest";
import { isPublished } from "@/lib/roster";
import { BUD_STATION_ID } from "@/lib/stations";
import { localDayRange, localToUtc, parseLocalDate, toLocalDate } from "@/lib/time";

// The test data of the load test (CLAUDE.md, 13. mérföldkő, utómunka,
// "Terhelési próba"), on the production setup, before going live:
//   npx tsx scripts/loadtest-data.ts create [--agents 200] [--leads 10] [--force]
//   npx tsx scripts/loadtest-data.ts remove
// "create" makes agents (lt-agent-0001 …) and shift leads (lt-lead-01 …) with
// one generated password, a test airline (9Z) with one quick turnaround a day
// for every agent, assigned to them, and a published roster for today. It
// refuses while the database holds real flights (unless --force), since the
// test belongs before going live. "remove" takes all of it away again.

const MINUTE = 60_000;

function option(name: string, fallback: number): number {
  const at = process.argv.indexOf(`--${name}`);
  const value = at > 0 ? Number(process.argv[at + 1]) : fallback;
  if (!Number.isInteger(value) || value < 1) throw new Error(`--${name}: pozitív egész szám kell`);
  return value;
}

async function create() {
  const agents = option("agents", 200);
  const leads = option("leads", Math.max(1, Math.ceil(agents / 20)));
  const force = process.argv.includes("--force");

  if (await prisma.user.count({ where: { username: { startsWith: LOADTEST_USER_PREFIX } } })) {
    throw new Error("Már vannak terhelési próbaadatok. Előbb: npx tsx scripts/loadtest-data.ts remove");
  }
  const existing = await prisma.airline.findUnique({ where: { iataCode: LOADTEST_AIRLINE.iataCode } });
  if (existing) throw new Error(`Már van ${LOADTEST_AIRLINE.iataCode} kódú légitársaság; a próba ezt a kódot használná.`);
  const realFlights = await prisma.flight.count();
  if (realFlights > 0 && !force) {
    throw new Error(`Az adatbázisban ${realFlights} valódi járat van: a terhelési próba az élesítés előtt való. (Szándékosan mégis: --force)`);
  }

  const [agentRole, leadRole, taskType, shiftType] = await Promise.all([
    prisma.role.findUniqueOrThrow({ where: { name: "Ügynök" } }),
    prisma.role.findUniqueOrThrow({ where: { name: "Műszakvezető" } }),
    prisma.taskType.findUniqueOrThrow({ where: { code: BASE_TASK_TYPE.code } }),
    prisma.segmentType.findUniqueOrThrow({ where: { code: "SHIFT" } }),
  ]);
  const password = randomBytes(12).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 10);
  const day = toLocalDate(new Date());

  const leadNames = Array.from({ length: leads }, (_, i) => `${LOADTEST_USER_PREFIX}lead-${String(i + 1).padStart(2, "0")}`);
  const agentNames = Array.from({ length: agents }, (_, i) => `${LOADTEST_USER_PREFIX}agent-${String(i + 1).padStart(4, "0")}`);
  const leadUsers = await prisma.user.createManyAndReturn({
    data: leadNames.map((username, i) => ({ username, name: `Próba Vezető ${i + 1}`, passwordHash, defaultStationId: BUD_STATION_ID })),
    select: { id: true },
  });
  const team = await prisma.team.create({ data: { name: LOADTEST_TEAM, leaderId: leadUsers[0].id } });
  const agentUsers = await prisma.user.createManyAndReturn({
    data: agentNames.map((username, i) => ({ username, name: `Próba Ügynök ${i + 1}`, passwordHash, teamId: team.id, defaultStationId: BUD_STATION_ID })),
    select: { id: true },
  });
  await prisma.userRole.createMany({
    data: [...leadUsers.map((u) => ({ userId: u.id, roleId: leadRole.id })), ...agentUsers.map((u) => ({ userId: u.id, roleId: agentRole.id }))],
  });

  // The test airline with the demo template, its only (primary) task type "Alap".
  const airline = await prisma.airline.create({ data: LOADTEST_AIRLINE });
  const template = await prisma.turnaroundTemplate.create({
    data: { name: "Próba", ...DEMO_TEMPLATE_PARAMS, airlineId: airline.id, taskTypeId: taskType.id, milestones: { create: DEMO_MILESTONES } },
  });
  await prisma.airlineTaskType.create({ data: { airlineId: airline.id, taskTypeId: taskType.id, templateId: template.id, isPrimary: true } });

  // One quick turnaround for each agent, spread over the day from 05:00 to 22:00.
  const d = parseLocalDate(day)!;
  const first = localToUtc(d.year, d.month, d.day, 5, 0).getTime();
  const step = Math.max(1, Math.floor((17 * 60) / agents));
  const flightDate = new Date(`${day}T00:00:00Z`);
  const flights = await prisma.flight.createManyAndReturn({
    data: agentUsers.map((_, i) => {
      const sta = new Date(first + ((i * step) % (17 * 60)) * MINUTE);
      return {
        airlineId: airline.id,
        inboundFlightNumber: `${LOADTEST_AIRLINE.iataCode}${1000 + 2 * i + 1}`,
        outboundFlightNumber: `${LOADTEST_AIRLINE.iataCode}${1000 + 2 * i + 2}`,
        sta,
        std: new Date(sta.getTime() + 40 * MINUTE),
        arrivalFlightDate: flightDate,
        departureFlightDate: flightDate,
        stand: `P${(i % 30) + 1}`,
      };
    }),
    select: { id: true, sta: true },
  });
  await prisma.task.createMany({
    data: flights.map((flight, i) => ({
      flightId: flight.id,
      taskTypeId: taskType.id,
      templateId: template.id,
      isPrimary: true,
      arrivalAgentId: agentUsers[i].id,
      departureAgentId: agentUsers[i].id,
    })),
  });

  // Today's roster: published (when today is not yet) and actual, around each agent's flight.
  const publications = await prisma.publication.findMany({ select: { startDate: true, endDate: true } });
  const publication = isPublished(day, publications)
    ? null
    : await prisma.publication.create({
        data: { startDate: localDayRange(day).start, endDate: localDayRange(day).start, publishedById: leadUsers[0].id },
      });
  for (const layer of ["PUBLISHED", "ACTUAL"] as const) {
    const shifts = await prisma.shift.createManyAndReturn({
      data: agentUsers.map((u) => ({ userId: u.id, layer, publicationId: layer === "PUBLISHED" ? (publication?.id ?? null) : null })),
      select: { id: true },
    });
    await prisma.shiftSegment.createMany({
      data: shifts.map((shift, i) => ({
        shiftId: shift.id,
        segmentTypeId: shiftType.id,
        start: new Date(flights[i].sta!.getTime() - 60 * MINUTE),
        end: new Date(flights[i].sta!.getTime() + 7 * 60 * MINUTE),
      })),
    });
  }

  console.log(`Terhelési próbaadatok kész (${day}): ${agents} ügynök (lt-agent-0001 …), ${leads} műszakvezető (lt-lead-01 …), ${flights.length} járat, publikált és valós beosztás.`);
  console.log(`A próbafelhasználók közös jelszava (csak most látszik): ${password}`);
  console.log(`A végén: npx tsx scripts/loadtest-data.ts remove`);
}

async function remove() {
  const users = await prisma.user.findMany({ where: { username: { startsWith: LOADTEST_USER_PREFIX } }, select: { id: true } });
  const userIds = users.map((u) => u.id);
  const airline = await prisma.airline.findUnique({ where: { iataCode: LOADTEST_AIRLINE.iataCode } });
  await prisma.$transaction(async (tx) => {
    if (airline) {
      // The flights take their tasks, records and logs with them.
      await tx.flight.deleteMany({ where: { airlineId: airline.id } });
      await tx.airlineTaskType.deleteMany({ where: { airlineId: airline.id } });
      const templates = await tx.turnaroundTemplate.findMany({ where: { airlineId: airline.id }, select: { id: true } });
      await tx.milestoneDefinition.deleteMany({ where: { templateId: { in: templates.map((t) => t.id) } } });
      await tx.turnaroundTemplate.deleteMany({ where: { airlineId: airline.id } });
      await tx.airline.delete({ where: { id: airline.id } });
    }
    await tx.shift.deleteMany({ where: { userId: { in: userIds } } });
    await tx.publication.deleteMany({ where: { publishedById: { in: userIds } } });
    await tx.user.updateMany({ where: { id: { in: userIds } }, data: { teamId: null } });
    await tx.team.deleteMany({ where: { name: LOADTEST_TEAM } });
    await tx.loginAttempt.deleteMany({ where: { username: { startsWith: LOADTEST_USER_PREFIX } } });
    await tx.user.deleteMany({ where: { id: { in: userIds } } });
  }, { timeout: 120_000 });
  console.log(`Terhelési próbaadatok eltávolítva: ${userIds.length} felhasználó${airline ? ", a próba-légitársaság és a járatai" : ""}.`);
}

const command = process.argv[2];
(command === "create" ? create() : command === "remove" ? remove() : Promise.reject(new Error("Használat: create [--agents N] [--leads N] [--force] | remove")))
  .catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
