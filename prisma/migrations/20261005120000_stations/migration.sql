-- Several stations within a company (CLAUDE.md, 14. mérföldkő, 1. lépés).
-- Every existing row goes to the BUD station; the role assignments and the
-- individual permissions are for BUD, those of the Admin role holders for every
-- station. The behaviour does not change.

-- The stations: an airport of the airport table with its time zone.
CREATE TABLE "Station" (
    "id" TEXT NOT NULL,
    "airportId" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Station_airportId_key" ON "Station"("airportId");
ALTER TABLE "Station" ADD CONSTRAINT "Station_airportId_fkey" FOREIGN KEY ("airportId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- BUD, with a fixed id: until every page and action gives the station (14.
-- mérföldkő, 4. lépés), a new row of a station-owned table goes there by default.
INSERT INTO "Airport" ("id", "iataCode", "icaoCode", "name", "updatedAt")
SELECT gen_random_uuid()::text, 'BUD', 'LHBP', 'Budapest Liszt Ferenc', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Airport" WHERE "iataCode" = 'BUD');
INSERT INTO "Station" ("id", "airportId", "timeZone", "updatedAt")
SELECT 'station-bud', "id", 'Europe/Budapest', CURRENT_TIMESTAMP FROM "Airport" WHERE "iataCode" = 'BUD';

-- The station on the station-owned roots; their children belong through them.
ALTER TABLE "AddressBookEntry" ADD COLUMN "stationId" TEXT NOT NULL DEFAULT 'station-bud';
ALTER TABLE "AirlineTaskType" ADD COLUMN "stationId" TEXT NOT NULL DEFAULT 'station-bud';
ALTER TABLE "Equipment" ADD COLUMN "stationId" TEXT NOT NULL DEFAULT 'station-bud';
ALTER TABLE "ExamQuestion" ADD COLUMN "stationId" TEXT NOT NULL DEFAULT 'station-bud';
ALTER TABLE "Flight" ADD COLUMN "stationId" TEXT NOT NULL DEFAULT 'station-bud';
ALTER TABLE "ImportRun" ADD COLUMN "stationId" TEXT NOT NULL DEFAULT 'station-bud';
ALTER TABLE "Plan" ADD COLUMN "stationId" TEXT NOT NULL DEFAULT 'station-bud';
ALTER TABLE "Publication" ADD COLUMN "stationId" TEXT NOT NULL DEFAULT 'station-bud';
ALTER TABLE "Shift" ADD COLUMN "stationId" TEXT NOT NULL DEFAULT 'station-bud';
ALTER TABLE "Team" ADD COLUMN "stationId" TEXT NOT NULL DEFAULT 'station-bud';
ALTER TABLE "Training" ADD COLUMN "stationId" TEXT NOT NULL DEFAULT 'station-bud';
ALTER TABLE "TurnaroundTemplate" ADD COLUMN "stationId" TEXT NOT NULL DEFAULT 'station-bud';

CREATE INDEX "AddressBookEntry_stationId_idx" ON "AddressBookEntry"("stationId");
CREATE INDEX "AirlineTaskType_stationId_idx" ON "AirlineTaskType"("stationId");
CREATE INDEX "Equipment_stationId_idx" ON "Equipment"("stationId");
CREATE INDEX "ExamQuestion_stationId_idx" ON "ExamQuestion"("stationId");
CREATE INDEX "Flight_stationId_idx" ON "Flight"("stationId");
CREATE INDEX "ImportRun_stationId_idx" ON "ImportRun"("stationId");
CREATE INDEX "Plan_stationId_idx" ON "Plan"("stationId");
CREATE INDEX "Publication_stationId_idx" ON "Publication"("stationId");
CREATE INDEX "Shift_stationId_idx" ON "Shift"("stationId");
CREATE INDEX "Team_stationId_idx" ON "Team"("stationId");
CREATE INDEX "Training_stationId_idx" ON "Training"("stationId");
CREATE INDEX "TurnaroundTemplate_stationId_idx" ON "TurnaroundTemplate"("stationId");

ALTER TABLE "AddressBookEntry" ADD CONSTRAINT "AddressBookEntry_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AirlineTaskType" ADD CONSTRAINT "AirlineTaskType_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImportRun" ADD CONSTRAINT "ImportRun_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Team" ADD CONSTRAINT "Team_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Training" ADD CONSTRAINT "Training_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TurnaroundTemplate" ADD CONSTRAINT "TurnaroundTemplate_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The station's own settings, copied from the single settings row; the company's stay there.
CREATE TABLE "StationSetting" (
    "stationId" TEXT NOT NULL,
    "deviationGreenMaxMinutes" INTEGER NOT NULL DEFAULT 0,
    "deviationYellowMaxMinutes" INTEGER NOT NULL DEFAULT 5,
    "expiryWarningDays" INTEGER NOT NULL DEFAULT 30,
    "equipmentWarningDays" INTEGER NOT NULL DEFAULT 30,
    "senderEmail" TEXT,
    "senderTypeB" TEXT,
    "slotToleranceMinutes" INTEGER NOT NULL DEFAULT 10,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StationSetting_pkey" PRIMARY KEY ("stationId")
);
ALTER TABLE "StationSetting" ADD CONSTRAINT "StationSetting_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
INSERT INTO "StationSetting" ("stationId", "deviationGreenMaxMinutes", "deviationYellowMaxMinutes", "expiryWarningDays",
  "equipmentWarningDays", "senderEmail", "senderTypeB", "slotToleranceMinutes", "updatedAt")
SELECT 'station-bud', "deviationGreenMaxMinutes", "deviationYellowMaxMinutes", "expiryWarningDays",
  "equipmentWarningDays", "senderEmail", "senderTypeB", "slotToleranceMinutes", CURRENT_TIMESTAMP
FROM "Setting" WHERE "id" = 'global';
-- A database without a settings row yet (e.g. a new production one) gets the defaults.
INSERT INTO "StationSetting" ("stationId", "updatedAt")
SELECT 'station-bud', CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM "StationSetting" WHERE "stationId" = 'station-bud');
-- The rules the database kept on them move along.
ALTER TABLE "StationSetting" ADD CONSTRAINT "StationSetting_expiry_warning" CHECK ("expiryWarningDays" >= 0);
ALTER TABLE "StationSetting" ADD CONSTRAINT "StationSetting_slot_tolerance" CHECK ("slotToleranceMinutes" >= 0);
ALTER TABLE "StationSetting" ADD CONSTRAINT "StationSetting_equipment_warning_days" CHECK ("equipmentWarningDays" BETWEEN 0 AND 365);

ALTER TABLE "Setting" DROP COLUMN "deviationGreenMaxMinutes",
DROP COLUMN "deviationYellowMaxMinutes",
DROP COLUMN "equipmentWarningDays",
DROP COLUMN "expiryWarningDays",
DROP COLUMN "senderEmail",
DROP COLUMN "senderTypeB",
DROP COLUMN "slotToleranceMinutes";

-- The planning settings: one row per station; the existing one is BUD's.
ALTER TABLE "PlanningSetting" ADD COLUMN "stationId" TEXT NOT NULL DEFAULT 'station-bud',
ALTER COLUMN "id" DROP DEFAULT;
CREATE UNIQUE INDEX "PlanningSetting_stationId_key" ON "PlanningSetting"("stationId");
ALTER TABLE "PlanningSetting" ADD CONSTRAINT "PlanningSetting_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The role assignments: for BUD, those of the Admin role holders for every station (no station).
ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_pkey",
ADD COLUMN "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
ADD COLUMN "stationId" TEXT DEFAULT 'station-bud',
ADD CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id");
ALTER TABLE "UserRole" ALTER COLUMN "id" DROP DEFAULT;

ALTER TABLE "UserPermission" ADD COLUMN "stationId" TEXT DEFAULT 'station-bud';
DROP INDEX "UserPermission_userId_permission_key";

UPDATE "UserRole" SET "stationId" = NULL
WHERE "userId" IN (
  SELECT ur."userId" FROM "UserRole" ur JOIN "Role" r ON r."id" = ur."roleId" WHERE r."name" = 'Admin' AND r."builtIn"
);
UPDATE "UserPermission" SET "stationId" = NULL
WHERE "userId" IN (
  SELECT ur."userId" FROM "UserRole" ur JOIN "Role" r ON r."id" = ur."roleId" WHERE r."name" = 'Admin' AND r."builtIn"
);

-- "Every station" (no station) counts once: unique with NULLS NOT DISTINCT.
CREATE UNIQUE INDEX "UserRole_userId_roleId_stationId_key" ON "UserRole"("userId", "roleId", "stationId") NULLS NOT DISTINCT;
CREATE UNIQUE INDEX "UserPermission_userId_permission_stationId_key" ON "UserPermission"("userId", "permission", "stationId") NULLS NOT DISTINCT;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Every user starts on BUD.
ALTER TABLE "User" ADD COLUMN "defaultStationId" TEXT;
UPDATE "User" SET "defaultStationId" = 'station-bud';
ALTER TABLE "User" ADD CONSTRAINT "User_defaultStationId_fkey" FOREIGN KEY ("defaultStationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;
