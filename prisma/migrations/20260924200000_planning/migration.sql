-- CreateEnum
CREATE TYPE "WindowPart" AS ENUM ('WHOLE', 'ARRIVAL_PART', 'DEPARTURE_PART');

-- CreateTable
CREATE TABLE "PlanningSetting" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "minShiftMinutes" INTEGER NOT NULL DEFAULT 240,
    "maxShiftMinutes" INTEGER NOT NULL DEFAULT 720,
    "breakMinutes" INTEGER NOT NULL DEFAULT 20,
    "breakAfterMinutes" INTEGER NOT NULL DEFAULT 360,
    "restMinutes" INTEGER NOT NULL DEFAULT 0,
    "overlapMinutes" INTEGER NOT NULL DEFAULT 0,
    "extraPositions" INTEGER NOT NULL DEFAULT 0,
    "segmentTypeId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanningSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanDay" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "settings" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanPosition" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "userId" TEXT,
    "shiftId" TEXT,

    CONSTRAINT "PlanPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanItem" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "part" "WindowPart" NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "manual" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanDay_planId_date_key" ON "PlanDay"("planId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PlanPosition_shiftId_key" ON "PlanPosition"("shiftId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanPosition_dayId_number_key" ON "PlanPosition"("dayId", "number");

-- CreateIndex
CREATE INDEX "PlanItem_positionId_idx" ON "PlanItem"("positionId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanItem_dayId_taskId_part_key" ON "PlanItem"("dayId", "taskId", "part");

-- AddForeignKey
ALTER TABLE "PlanningSetting" ADD CONSTRAINT "PlanningSetting_segmentTypeId_fkey" FOREIGN KEY ("segmentTypeId") REFERENCES "SegmentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanDay" ADD CONSTRAINT "PlanDay_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanPosition" ADD CONSTRAINT "PlanPosition_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "PlanDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanPosition" ADD CONSTRAINT "PlanPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanPosition" ADD CONSTRAINT "PlanPosition_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanItem" ADD CONSTRAINT "PlanItem_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "PlanDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanItem" ADD CONSTRAINT "PlanItem_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "PlanPosition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanItem" ADD CONSTRAINT "PlanItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Rules of the planning settings (CLAUDE.md, "Tervezési beállítások").
ALTER TABLE "PlanningSetting"
  ADD CONSTRAINT "PlanningSetting_non_negative" CHECK (
    "minShiftMinutes" >= 0 AND "breakMinutes" >= 0 AND "breakAfterMinutes" >= 0
    AND "restMinutes" >= 0 AND "overlapMinutes" >= 0 AND "extraPositions" >= 0
  ),
  ADD CONSTRAINT "PlanningSetting_shift_length" CHECK ("maxShiftMinutes" >= "minShiftMinutes"),
  ADD CONSTRAINT "PlanningSetting_rest_or_overlap" CHECK ("restMinutes" = 0 OR "overlapMinutes" = 0);

ALTER TABLE "Plan" ADD CONSTRAINT "Plan_period" CHECK ("endDate" >= "startDate");
ALTER TABLE "PlanItem" ADD CONSTRAINT "PlanItem_window" CHECK ("end" > "start");

-- The default settings, saving into the Műszak segment type when there is one.
INSERT INTO "PlanningSetting" ("id", "segmentTypeId", "updatedAt")
SELECT 'global', (SELECT "id" FROM "SegmentType" WHERE "code" = 'SHIFT'), now()
ON CONFLICT ("id") DO NOTHING;

-- New permission "Tervezés": the built-in Admin role has every permission,
-- and the default planner role gets it too.
INSERT INTO "RolePermission" ("id", "roleId", "permission", "scope")
SELECT gen_random_uuid()::text, r."id", 'PLANNING', 'ALL'::"PermissionScope"
FROM "Role" r
WHERE r."builtIn" OR r."name" = 'Tervező'
ON CONFLICT ("roleId", "permission") DO NOTHING;
