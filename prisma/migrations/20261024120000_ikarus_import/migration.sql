-- AlterEnum
ALTER TYPE "EstimateSource" ADD VALUE 'IKARUS';

-- AlterTable
ALTER TABLE "Airline" ADD COLUMN     "ikarusImport" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Flight" ADD COLUMN     "arrivalAodbId" INTEGER,
ADD COLUMN     "departureAodbId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Flight_stationId_arrivalAodbId_key" ON "Flight"("stationId", "arrivalAodbId");

-- CreateIndex
CREATE UNIQUE INDEX "Flight_stationId_departureAodbId_key" ON "Flight"("stationId", "departureAodbId");

