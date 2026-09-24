-- CreateEnum
CREATE TYPE "EstimateSource" AS ENUM ('MANUAL', 'MESSAGE');

-- CreateEnum
CREATE TYPE "FlightEventKind" AS ENUM ('DELAY', 'CANCEL', 'RESTORE');

-- AlterTable
ALTER TABLE "Flight" ADD COLUMN     "arrivalCancelled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "arrivalCancelledAt" TIMESTAMP(3),
ADD COLUMN     "arrivalCancelledById" TEXT,
ADD COLUMN     "departureCancelled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "departureCancelledAt" TIMESTAMP(3),
ADD COLUMN     "departureCancelledById" TEXT,
ADD COLUMN     "etaNote" TEXT,
ADD COLUMN     "etaRecordedAt" TIMESTAMP(3),
ADD COLUMN     "etaRecordedById" TEXT,
ADD COLUMN     "etaSource" "EstimateSource",
ADD COLUMN     "etdNote" TEXT,
ADD COLUMN     "etdRecordedAt" TIMESTAMP(3),
ADD COLUMN     "etdRecordedById" TEXT,
ADD COLUMN     "etdSource" "EstimateSource";

-- CreateTable
CREATE TABLE "FlightEvent" (
    "id" TEXT NOT NULL,
    "flightId" TEXT NOT NULL,
    "kind" "FlightEventKind" NOT NULL,
    "part" "MilestonePart",
    "eta" TIMESTAMP(3),
    "etd" TIMESTAMP(3),
    "source" "EstimateSource",
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlightEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlightEvent_flightId_createdAt_idx" ON "FlightEvent"("flightId", "createdAt");

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_etaRecordedById_fkey" FOREIGN KEY ("etaRecordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_etdRecordedById_fkey" FOREIGN KEY ("etdRecordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_arrivalCancelledById_fkey" FOREIGN KEY ("arrivalCancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_departureCancelledById_fkey" FOREIGN KEY ("departureCancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightEvent" ADD CONSTRAINT "FlightEvent_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "Flight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightEvent" ADD CONSTRAINT "FlightEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Existing estimates were typed in by hand; who and when is unknown.
UPDATE "Flight" SET "etaSource" = 'MANUAL' WHERE "eta" IS NOT NULL;
UPDATE "Flight" SET "etdSource" = 'MANUAL' WHERE "etd" IS NOT NULL;

-- Only an existing part can be cancelled.
ALTER TABLE "Flight"
  ADD CONSTRAINT "Flight_cancelled_part_exists" CHECK (
    (NOT "arrivalCancelled" OR "sta" IS NOT NULL) AND (NOT "departureCancelled" OR "std" IS NOT NULL)
  );
