-- CreateEnum
CREATE TYPE "FlightSource" AS ENUM ('MANUAL', 'IMPORT');

-- AlterTable
ALTER TABLE "Airline" ADD COLUMN     "defaultTemplateId" TEXT;

-- AlterTable
ALTER TABLE "Flight" ADD COLUMN     "aircraftConfig" TEXT,
ADD COLUMN     "aircraftType" TEXT,
ADD COLUMN     "arrivalFlightDate" DATE,
ADD COLUMN     "arrivalMissing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "departureFlightDate" DATE,
ADD COLUMN     "departureMissing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "destination" TEXT,
ADD COLUMN     "importProfileId" TEXT,
ADD COLUMN     "missingImportRunId" TEXT,
ADD COLUMN     "origin" TEXT,
ADD COLUMN     "source" "FlightSource" NOT NULL DEFAULT 'MANUAL',
ALTER COLUMN "stand" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ImportProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "headerFingerprint" TEXT NOT NULL,
    "mapping" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRun" (
    "id" TEXT NOT NULL,
    "profileId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "rangeStart" DATE NOT NULL,
    "rangeEnd" DATE NOT NULL,
    "summary" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportUpload" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "content" BYTEA NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImportProfile_name_key" ON "ImportProfile"("name");

-- CreateIndex
CREATE INDEX "ImportProfile_headerFingerprint_idx" ON "ImportProfile"("headerFingerprint");

-- CreateIndex
CREATE INDEX "ImportRun_createdAt_idx" ON "ImportRun"("createdAt");

-- CreateIndex
CREATE INDEX "ImportUpload_createdAt_idx" ON "ImportUpload"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Flight_airlineId_inboundFlightNumber_arrivalFlightDate_orig_key" ON "Flight"("airlineId", "inboundFlightNumber", "arrivalFlightDate", "origin");

-- CreateIndex
CREATE UNIQUE INDEX "Flight_airlineId_outboundFlightNumber_departureFlightDate_d_key" ON "Flight"("airlineId", "outboundFlightNumber", "departureFlightDate", "destination");

-- AddForeignKey
ALTER TABLE "Airline" ADD CONSTRAINT "Airline_defaultTemplateId_fkey" FOREIGN KEY ("defaultTemplateId") REFERENCES "TurnaroundTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_importProfileId_fkey" FOREIGN KEY ("importProfileId") REFERENCES "ImportProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_missingImportRunId_fkey" FOREIGN KEY ("missingImportRunId") REFERENCES "ImportRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportProfile" ADD CONSTRAINT "ImportProfile_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRun" ADD CONSTRAINT "ImportRun_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ImportProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRun" ADD CONSTRAINT "ImportRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportUpload" ADD CONSTRAINT "ImportUpload_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- New permission "Járatrend importálása": the built-in Admin role has every
-- permission, and the default planner role gets it too.
INSERT INTO "RolePermission" ("id", "roleId", "permission", "scope")
SELECT gen_random_uuid()::text, r."id", 'SCHEDULE_IMPORT', 'ALL'::"PermissionScope"
FROM "Role" r
WHERE r."builtIn" OR r."name" = 'Tervező'
ON CONFLICT ("roleId", "permission") DO NOTHING;
