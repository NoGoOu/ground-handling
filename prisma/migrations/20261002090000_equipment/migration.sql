-- CreateEnum
CREATE TYPE "EquipmentFieldKind" AS ENUM ('DEADLINE', 'COUNTER', 'TEXT');

-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('OPERATIONAL', 'OUT_OF_SERVICE', 'RETIRED');

-- CreateEnum
CREATE TYPE "FaultStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "FaultResolution" AS ENUM ('FIXED', 'NOT_A_FAULT');

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "equipmentWarningDays" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "EquipmentType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentField" (
    "id" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "EquipmentFieldKind" NOT NULL,
    "unit" TEXT,
    "order" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "plate" TEXT,
    "description" TEXT,
    "status" "EquipmentStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentValue" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "dateValue" DATE,
    "numberValue" DOUBLE PRECISION,
    "dueValue" DOUBLE PRECISION,
    "textValue" TEXT,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentValueLog" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentValueLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentEvent" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "fromStatus" "EquipmentStatus",
    "toStatus" "EquipmentStatus" NOT NULL,
    "note" TEXT,
    "faultId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentDocument" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedById" TEXT,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "EquipmentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fault" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reportedOutOfService" BOOLEAN NOT NULL DEFAULT false,
    "status" "FaultStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" "FaultResolution",
    "reportedById" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "takenById" TEXT,
    "takenAt" TIMESTAMP(3),
    "closedById" TEXT,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Fault_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaultPhoto" (
    "id" TEXT NOT NULL,
    "faultId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaultPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaultComment" (
    "id" TEXT NOT NULL,
    "faultId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaultComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaultEvent" (
    "id" TEXT NOT NULL,
    "faultId" TEXT NOT NULL,
    "fromStatus" "FaultStatus",
    "toStatus" "FaultStatus" NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaultEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentType_name_key" ON "EquipmentType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentType_code_key" ON "EquipmentType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentField_typeId_name_key" ON "EquipmentField"("typeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_identifier_key" ON "Equipment"("identifier");

-- CreateIndex
CREATE INDEX "Equipment_typeId_idx" ON "Equipment"("typeId");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentValue_equipmentId_fieldId_key" ON "EquipmentValue"("equipmentId", "fieldId");

-- CreateIndex
CREATE INDEX "EquipmentValueLog_equipmentId_idx" ON "EquipmentValueLog"("equipmentId");

-- CreateIndex
CREATE INDEX "EquipmentEvent_equipmentId_idx" ON "EquipmentEvent"("equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentDocument_storageKey_key" ON "EquipmentDocument"("storageKey");

-- CreateIndex
CREATE INDEX "EquipmentDocument_equipmentId_idx" ON "EquipmentDocument"("equipmentId");

-- CreateIndex
CREATE INDEX "Fault_equipmentId_idx" ON "Fault"("equipmentId");

-- CreateIndex
CREATE INDEX "Fault_status_idx" ON "Fault"("status");

-- CreateIndex
CREATE INDEX "Fault_reportedById_idx" ON "Fault"("reportedById");

-- CreateIndex
CREATE UNIQUE INDEX "FaultPhoto_storageKey_key" ON "FaultPhoto"("storageKey");

-- CreateIndex
CREATE INDEX "FaultPhoto_faultId_idx" ON "FaultPhoto"("faultId");

-- CreateIndex
CREATE INDEX "FaultComment_faultId_idx" ON "FaultComment"("faultId");

-- CreateIndex
CREATE INDEX "FaultEvent_faultId_idx" ON "FaultEvent"("faultId");

-- AddForeignKey
ALTER TABLE "EquipmentField" ADD CONSTRAINT "EquipmentField_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "EquipmentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "EquipmentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentValue" ADD CONSTRAINT "EquipmentValue_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentValue" ADD CONSTRAINT "EquipmentValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "EquipmentField"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentValue" ADD CONSTRAINT "EquipmentValue_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentValueLog" ADD CONSTRAINT "EquipmentValueLog_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentValueLog" ADD CONSTRAINT "EquipmentValueLog_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "EquipmentField"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentValueLog" ADD CONSTRAINT "EquipmentValueLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentEvent" ADD CONSTRAINT "EquipmentEvent_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentEvent" ADD CONSTRAINT "EquipmentEvent_faultId_fkey" FOREIGN KEY ("faultId") REFERENCES "Fault"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentEvent" ADD CONSTRAINT "EquipmentEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentDocument" ADD CONSTRAINT "EquipmentDocument_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentDocument" ADD CONSTRAINT "EquipmentDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentDocument" ADD CONSTRAINT "EquipmentDocument_removedById_fkey" FOREIGN KEY ("removedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fault" ADD CONSTRAINT "Fault_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fault" ADD CONSTRAINT "Fault_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fault" ADD CONSTRAINT "Fault_takenById_fkey" FOREIGN KEY ("takenById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fault" ADD CONSTRAINT "Fault_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaultPhoto" ADD CONSTRAINT "FaultPhoto_faultId_fkey" FOREIGN KEY ("faultId") REFERENCES "Fault"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaultPhoto" ADD CONSTRAINT "FaultPhoto_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaultComment" ADD CONSTRAINT "FaultComment_faultId_fkey" FOREIGN KEY ("faultId") REFERENCES "Fault"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaultComment" ADD CONSTRAINT "FaultComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaultEvent" ADD CONSTRAINT "FaultEvent_faultId_fkey" FOREIGN KEY ("faultId") REFERENCES "Fault"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaultEvent" ADD CONSTRAINT "FaultEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Rules the database keeps (CLAUDE.md, 11. mérföldkő).
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_equipment_warning_days" CHECK ("equipmentWarningDays" BETWEEN 0 AND 365);
-- A counter's due value goes with a counter; a resolution exactly with a closed fault.
ALTER TABLE "EquipmentValue" ADD CONSTRAINT "EquipmentValue_counter" CHECK (("numberValue" IS NULL OR "numberValue" >= 0) AND ("dueValue" IS NULL OR "dueValue" >= 0));
ALTER TABLE "Fault" ADD CONSTRAINT "Fault_resolution" CHECK (("status" = 'CLOSED') = ("resolution" IS NOT NULL));
ALTER TABLE "Fault" ADD CONSTRAINT "Fault_closed" CHECK (("status" = 'CLOSED') = ("closedAt" IS NOT NULL));

-- The new default role: the technical staff.
INSERT INTO "Role" ("id", "name", "builtIn", "updatedAt")
SELECT gen_random_uuid()::text, 'Műszaki', false, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Role" WHERE "name" = 'Műszaki');

INSERT INTO "RolePermission" ("id", "roleId", "permission", "scope")
SELECT gen_random_uuid()::text, r."id", p.permission, p.scope::"PermissionScope"
FROM "Role" r
JOIN (VALUES
  ('Műszaki', 'EQUIPMENT_MANAGE', 'ALL'),
  ('Műszaki', 'FAULT_MANAGE', 'ALL'),
  ('Műszaki', 'FAULT_REPORT', 'ALL'),
  ('Műszaki', 'FAULT_VIEW', 'ALL'),
  ('Műszakvezető', 'FAULT_REPORT', 'ALL'),
  ('Műszakvezető', 'FAULT_VIEW', 'ALL'),
  ('Tervező', 'FAULT_REPORT', 'ALL'),
  ('Oktatási koordinátor', 'FAULT_REPORT', 'ALL'),
  ('Mentor', 'FAULT_REPORT', 'ALL'),
  ('Vizsgáztató', 'FAULT_REPORT', 'ALL'),
  ('Ügynök', 'FAULT_REPORT', 'ALL'),
  ('Ügynök', 'FAULT_VIEW', 'SELF')
) AS p(role, permission, scope) ON p.role = r."name"
ON CONFLICT ("roleId", "permission") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permission", "scope")
SELECT gen_random_uuid()::text, r."id", p.permission, 'ALL'::"PermissionScope"
FROM "Role" r
CROSS JOIN (VALUES ('EQUIPMENT_MANAGE'), ('FAULT_MANAGE'), ('FAULT_REPORT'), ('FAULT_VIEW')) AS p(permission)
WHERE r."builtIn"
ON CONFLICT ("roleId", "permission") DO NOTHING;
