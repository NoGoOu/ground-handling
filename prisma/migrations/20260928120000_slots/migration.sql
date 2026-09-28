-- AlterTable
ALTER TABLE "Flight" ADD COLUMN     "departureIfplid" TEXT;

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "slotToleranceMinutes" INTEGER NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE "Airport" (
    "id" TEXT NOT NULL,
    "iataCode" TEXT NOT NULL,
    "icaoCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Airport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Airport_iataCode_key" ON "Airport"("iataCode");

-- CreateIndex
CREATE UNIQUE INDEX "Airport_icaoCode_key" ON "Airport"("icaoCode");

-- CreateIndex
CREATE INDEX "Flight_departureIfplid_idx" ON "Flight"("departureIfplid");


-- Hand-written (8. mérföldkő).
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_slot_tolerance" CHECK ("slotToleranceMinutes" >= 0);
ALTER TABLE "Airport" ADD CONSTRAINT "Airport_codes" CHECK ("iataCode" ~ '^[A-Z]{3}$' AND "icaoCode" ~ '^[A-Z]{4}$');
-- BUD is the home airport; the others come from the admin or the seed.
INSERT INTO "Airport" ("id", "iataCode", "icaoCode", "name", "updatedAt")
VALUES (gen_random_uuid()::text, 'BUD', 'LHBP', 'Budapest Liszt Ferenc', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
