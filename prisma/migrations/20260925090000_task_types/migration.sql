-- 5. mérföldkő, 1. lépés: task types. A flight gets one task per task type of
-- its airline; the template moves from the flight to the task, and the
-- airline's default template becomes its task types. Every existing row goes
-- under the "Alap" task type, so the behaviour does not change.

-- Task types, with "Alap" for everything that exists.
CREATE TABLE "TaskType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskType_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TaskType_name_key" ON "TaskType"("name");
CREATE UNIQUE INDEX "TaskType_code_key" ON "TaskType"("code");

INSERT INTO "TaskType" ("id", "name", "code", "updatedAt")
VALUES (gen_random_uuid()::text, 'Alap', 'ALAP', CURRENT_TIMESTAMP);

-- Templates belong to a task type and say which parts they have.
ALTER TABLE "TurnaroundTemplate"
  ADD COLUMN "arrivalPart" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "departurePart" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "taskTypeId" TEXT;
UPDATE "TurnaroundTemplate" SET "taskTypeId" = (SELECT "id" FROM "TaskType" WHERE "code" = 'ALAP');
ALTER TABLE "TurnaroundTemplate" ALTER COLUMN "taskTypeId" SET NOT NULL;
ALTER TABLE "TurnaroundTemplate" ADD CONSTRAINT "TurnaroundTemplate_taskTypeId_fkey" FOREIGN KEY ("taskTypeId") REFERENCES "TaskType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TurnaroundTemplate" ADD CONSTRAINT "TurnaroundTemplate_has_a_part" CHECK ("arrivalPart" OR "departurePart");

-- The airline's task types: its default template becomes the one, primary "Alap".
CREATE TABLE "AirlineTaskType" (
    "id" TEXT NOT NULL,
    "airlineId" TEXT NOT NULL,
    "taskTypeId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AirlineTaskType_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AirlineTaskType_airlineId_taskTypeId_key" ON "AirlineTaskType"("airlineId", "taskTypeId");
-- One primary task type per airline.
CREATE UNIQUE INDEX "AirlineTaskType_one_primary" ON "AirlineTaskType"("airlineId") WHERE "isPrimary";
ALTER TABLE "AirlineTaskType" ADD CONSTRAINT "AirlineTaskType_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AirlineTaskType" ADD CONSTRAINT "AirlineTaskType_taskTypeId_fkey" FOREIGN KEY ("taskTypeId") REFERENCES "TaskType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AirlineTaskType" ADD CONSTRAINT "AirlineTaskType_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TurnaroundTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "AirlineTaskType" ("id", "airlineId", "taskTypeId", "templateId", "active", "isPrimary", "updatedAt")
SELECT gen_random_uuid()::text, a."id", (SELECT "id" FROM "TaskType" WHERE "code" = 'ALAP'), a."defaultTemplateId", true, true, CURRENT_TIMESTAMP
FROM "Airline" a
WHERE a."defaultTemplateId" IS NOT NULL;

-- Tasks: the "Alap" type, the flight's template, and primary (the only task).
ALTER TABLE "Task"
  ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "taskTypeId" TEXT,
  ADD COLUMN "templateId" TEXT;
UPDATE "Task" t
SET "taskTypeId" = (SELECT "id" FROM "TaskType" WHERE "code" = 'ALAP'),
    "templateId" = f."templateId",
    "isPrimary" = true
FROM "Flight" f
WHERE f."id" = t."flightId";
ALTER TABLE "Task" ALTER COLUMN "taskTypeId" SET NOT NULL, ALTER COLUMN "templateId" SET NOT NULL;
ALTER TABLE "Task" ADD CONSTRAINT "Task_taskTypeId_fkey" FOREIGN KEY ("taskTypeId") REFERENCES "TaskType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TurnaroundTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Several tasks per flight: one per task type, one of them primary.
DROP INDEX "Task_flightId_key";
CREATE INDEX "Task_flightId_idx" ON "Task"("flightId");
CREATE UNIQUE INDEX "Task_flightId_taskTypeId_key" ON "Task"("flightId", "taskTypeId");
CREATE UNIQUE INDEX "Task_one_primary" ON "Task"("flightId") WHERE "isPrimary";

-- The template now lives on the task, and the default template on the airline's task types.
ALTER TABLE "Flight" DROP CONSTRAINT "Flight_templateId_fkey";
ALTER TABLE "Flight" DROP COLUMN "templateId";
ALTER TABLE "Airline" DROP CONSTRAINT "Airline_defaultTemplateId_fkey";
ALTER TABLE "Airline" DROP COLUMN "defaultTemplateId";
