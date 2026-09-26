-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "MessageSource" AS ENUM ('MANUAL', 'API', 'GENERATED');

-- CreateEnum
CREATE TYPE "DeliveryChannel" AS ENUM ('EMAIL', 'SITA');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('SENT', 'FAILED', 'NOT_SENDABLE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FlightEventKind" ADD VALUE 'ACTUAL';
ALTER TYPE "FlightEventKind" ADD VALUE 'REGISTRATION';
ALTER TYPE "FlightEventKind" ADD VALUE 'DELAY_CODES';

-- DropForeignKey
ALTER TABLE "FlightEvent" DROP CONSTRAINT "FlightEvent_createdById_fkey";

-- AlterTable
ALTER TABLE "Flight" ADD COLUMN     "arrivalRegistration" TEXT,
ADD COLUMN     "departureRegistration" TEXT;

-- AlterTable
ALTER TABLE "FlightEvent" ADD COLUMN     "ata" TIMESTAMP(3),
ADD COLUMN     "atd" TIMESTAMP(3),
ADD COLUMN     "messageId" TEXT,
ADD COLUMN     "registration" TEXT,
ALTER COLUMN "createdById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "senderEmail" TEXT,
ADD COLUMN     "senderTypeB" TEXT;

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "type" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "envelope" TEXT,
    "textHash" TEXT,
    "source" "MessageSource" NOT NULL,
    "apiKeyId" TEXT,
    "sourceNote" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "flightNumber" TEXT,
    "headerDate" TEXT,
    "registration" TEXT,
    "station" TEXT,
    "flightDate" DATE,
    "parsed" JSONB NOT NULL,
    "warnings" JSONB NOT NULL,
    "flightId" TEXT,
    "part" "MilestonePart",
    "unmatchedReason" TEXT,
    "kind" TEXT,
    "versionKey" TEXT,
    "supersedesId" TEXT,
    "current" BOOLEAN NOT NULL DEFAULT false,
    "discardedAt" TIMESTAMP(3),
    "discardedById" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageDelivery" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "channel" "DeliveryChannel" NOT NULL,
    "status" "DeliveryStatus" NOT NULL,
    "error" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DelayCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DelayCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DelayRecord" (
    "id" TEXT NOT NULL,
    "flightId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "source" "EstimateSource" NOT NULL,
    "messageId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DelayRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiCallLog" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" INTEGER NOT NULL,
    "result" TEXT NOT NULL,

    CONSTRAINT "ApiCallLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnsupportedMessageLog" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "flightNumber" TEXT,
    "headerDate" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "source" "MessageSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnsupportedMessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddressBookEntry" (
    "id" TEXT NOT NULL,
    "airlineId" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "channel" "DeliveryChannel" NOT NULL,
    "address" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddressBookEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Message_textHash_key" ON "Message"("textHash");

-- CreateIndex
CREATE UNIQUE INDEX "Message_supersedesId_key" ON "Message"("supersedesId");

-- CreateIndex
CREATE INDEX "Message_flightId_part_idx" ON "Message"("flightId", "part");

-- CreateIndex
CREATE INDEX "Message_versionKey_current_idx" ON "Message"("versionKey", "current");

-- CreateIndex
CREATE INDEX "Message_receivedAt_idx" ON "Message"("receivedAt");

-- CreateIndex
CREATE INDEX "MessageDelivery_messageId_idx" ON "MessageDelivery"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "DelayCode_code_key" ON "DelayCode"("code");

-- CreateIndex
CREATE INDEX "DelayRecord_flightId_idx" ON "DelayRecord"("flightId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_name_key" ON "ApiKey"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiCallLog_at_idx" ON "ApiCallLog"("at");

-- CreateIndex
CREATE INDEX "UnsupportedMessageLog_receivedAt_idx" ON "UnsupportedMessageLog"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AddressBookEntry_airlineId_messageType_address_key" ON "AddressBookEntry"("airlineId", "messageType", "address");

-- AddForeignKey
ALTER TABLE "FlightEvent" ADD CONSTRAINT "FlightEvent_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightEvent" ADD CONSTRAINT "FlightEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "Flight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_discardedById_fkey" FOREIGN KEY ("discardedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageDelivery" ADD CONSTRAINT "MessageDelivery_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelayRecord" ADD CONSTRAINT "DelayRecord_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "Flight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelayRecord" ADD CONSTRAINT "DelayRecord_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelayRecord" ADD CONSTRAINT "DelayRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelayRecord" ADD CONSTRAINT "DelayRecord_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiCallLog" ADD CONSTRAINT "ApiCallLog_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddressBookEntry" ADD CONSTRAINT "AddressBookEntry_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Hand-written (7. mérföldkő).
ALTER TABLE "DelayRecord" ADD CONSTRAINT "DelayRecord_minutes" CHECK ("minutes" > 0);
-- A matched message has a part; an unmatched one has neither.
ALTER TABLE "Message" ADD CONSTRAINT "Message_part" CHECK (("flightId" IS NULL) = ("part" IS NULL));
-- A SITA Type B address has 7 characters; an email address has an @.
ALTER TABLE "AddressBookEntry" ADD CONSTRAINT "AddressBookEntry_address" CHECK (
  ("channel" = 'SITA' AND "address" ~ '^[A-Z0-9]{7}$') OR ("channel" = 'EMAIL' AND "address" LIKE '%_@_%')
);

-- Messages are matched by the operating day. A flight typed in by hand gets
-- the day of its scheduled time in Budapest (approved decision).
UPDATE "Flight"
SET "arrivalFlightDate" = (("sta" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Budapest')::date
WHERE "arrivalFlightDate" IS NULL AND "sta" IS NOT NULL;
UPDATE "Flight"
SET "departureFlightDate" = (("std" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Budapest')::date
WHERE "departureFlightDate" IS NULL AND "std" IS NOT NULL;

-- The new permissions for the default roles; the built-in Admin has them all.
INSERT INTO "RolePermission" ("id", "roleId", "permission", "scope")
SELECT gen_random_uuid()::text, r."id", p.permission, p.scope::"PermissionScope"
FROM "Role" r
JOIN (VALUES
  ('Műszakvezető', 'MESSAGE_VIEW', 'ALL'),
  ('Műszakvezető', 'MESSAGE_RECORD', 'ALL'),
  ('Műszakvezető', 'MESSAGE_SEND', 'ALL'),
  ('Ügynök', 'MESSAGE_VIEW', 'SELF'),
  ('Ügynök', 'MESSAGE_SEND', 'SELF')
) AS p(role, permission, scope) ON p.role = r."name"
ON CONFLICT ("roleId", "permission") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permission", "scope")
SELECT gen_random_uuid()::text, r."id", p.permission, 'ALL'::"PermissionScope"
FROM "Role" r
CROSS JOIN (VALUES ('MESSAGE_VIEW'), ('MESSAGE_RECORD'), ('MESSAGE_SEND'), ('MESSAGING_SETTINGS')) AS p(permission)
WHERE r."builtIn"
ON CONFLICT ("roleId", "permission") DO NOTHING;
