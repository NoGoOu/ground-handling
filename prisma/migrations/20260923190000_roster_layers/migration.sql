-- Roster layers, segment types and shift segments (CLAUDE.md, 2. mérföldkő).
-- The existing simple shifts become ACTUAL shifts with a single "Műszak" segment,
-- so nothing is lost and there is no parallel model left.

-- CreateEnum
CREATE TYPE "RosterLayer" AS ENUM ('DRAFT', 'PUBLISHED', 'ACTUAL');

-- CreateTable
CREATE TABLE "SegmentType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "operative" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SegmentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publication" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "publishedById" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftSegment" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "segmentTypeId" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "createBlock" BOOLEAN NOT NULL DEFAULT false,
    "travelBeforeMinutes" INTEGER NOT NULL DEFAULT 0,
    "travelAfterMinutes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SegmentType_name_key" ON "SegmentType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SegmentType_code_key" ON "SegmentType"("code");

-- CreateIndex
CREATE INDEX "Publication_startDate_idx" ON "Publication"("startDate");

-- CreateIndex
CREATE INDEX "ShiftSegment_shiftId_idx" ON "ShiftSegment"("shiftId");

-- CreateIndex
CREATE INDEX "ShiftSegment_start_idx" ON "ShiftSegment"("start");

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSegment" ADD CONSTRAINT "ShiftSegment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSegment" ADD CONSTRAINT "ShiftSegment_segmentTypeId_fkey" FOREIGN KEY ("segmentTypeId") REFERENCES "SegmentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Data migration: the two starting segment types
INSERT INTO "SegmentType" ("id", "name", "code", "operative", "active", "createdAt", "updatedAt") VALUES
    (gen_random_uuid()::text, 'Műszak', 'SHIFT', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Oktatás', 'TRN', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable: the layer is filled in below, then made required
ALTER TABLE "Shift" ADD COLUMN     "layer" "RosterLayer",
ADD COLUMN     "publicationId" TEXT;

-- Data migration: existing shifts are actual shifts with one operative segment
UPDATE "Shift" SET "layer" = 'ACTUAL' WHERE "layer" IS NULL;

INSERT INTO "ShiftSegment" ("id", "shiftId", "start", "end", "segmentTypeId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, s."id", s."startsAt", s."endsAt", t."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Shift" s
CROSS JOIN (SELECT "id" FROM "SegmentType" WHERE "code" = 'SHIFT') t;

-- AlterTable: the old columns are gone, the layer is required
ALTER TABLE "Shift" ALTER COLUMN "layer" SET NOT NULL;

DROP INDEX "Shift_userId_startsAt_idx";

DROP INDEX "Shift_startsAt_idx";

ALTER TABLE "Shift" DROP COLUMN "endsAt",
DROP COLUMN "startsAt";

-- CreateIndex
CREATE INDEX "Shift_userId_layer_idx" ON "Shift"("userId", "layer");

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
