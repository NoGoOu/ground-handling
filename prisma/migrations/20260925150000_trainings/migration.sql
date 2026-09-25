-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "expiryWarningDays" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "Qualification" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "validityMonths" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Qualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Training" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qualificationId" TEXT,
    "hasExam" BOOLEAN NOT NULL DEFAULT false,
    "passPercent" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Training_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "completedOn" DATE NOT NULL,
    "examPercent" INTEGER,
    "passed" BOOLEAN NOT NULL,
    "validUntil" DATE,
    "validUntilManual" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingFile" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedById" TEXT,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "TrainingFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskRequirement" (
    "id" TEXT NOT NULL,
    "airlineTaskTypeId" TEXT NOT NULL,
    "part" "MilestonePart" NOT NULL,
    "qualificationId" TEXT NOT NULL,

    CONSTRAINT "TaskRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Qualification_name_key" ON "Qualification"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Qualification_code_key" ON "Qualification"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Training_name_key" ON "Training"("name");

-- CreateIndex
CREATE INDEX "TrainingRecord_userId_idx" ON "TrainingRecord"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingFile_storageKey_key" ON "TrainingFile"("storageKey");

-- CreateIndex
CREATE INDEX "TrainingFile_recordId_idx" ON "TrainingFile"("recordId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskRequirement_airlineTaskTypeId_part_qualificationId_key" ON "TaskRequirement"("airlineTaskTypeId", "part", "qualificationId");

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "Qualification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRecord" ADD CONSTRAINT "TrainingRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRecord" ADD CONSTRAINT "TrainingRecord_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "Training"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRecord" ADD CONSTRAINT "TrainingRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRecord" ADD CONSTRAINT "TrainingRecord_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingFile" ADD CONSTRAINT "TrainingFile_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "TrainingRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingFile" ADD CONSTRAINT "TrainingFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingFile" ADD CONSTRAINT "TrainingFile_removedById_fkey" FOREIGN KEY ("removedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskRequirement" ADD CONSTRAINT "TaskRequirement_airlineTaskTypeId_fkey" FOREIGN KEY ("airlineTaskTypeId") REFERENCES "AirlineTaskType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskRequirement" ADD CONSTRAINT "TaskRequirement_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "Qualification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Rules of the training data (CLAUDE.md, 6. mérföldkő).
ALTER TABLE "Qualification" ADD CONSTRAINT "Qualification_validity" CHECK ("validityMonths" IS NULL OR "validityMonths" > 0);
ALTER TABLE "Training" ADD CONSTRAINT "Training_pass_mark" CHECK (
  ("hasExam" AND "passPercent" BETWEEN 0 AND 100) OR (NOT "hasExam" AND "passPercent" IS NULL)
);
ALTER TABLE "TrainingRecord" ADD CONSTRAINT "TrainingRecord_exam" CHECK ("examPercent" IS NULL OR "examPercent" BETWEEN 0 AND 100);
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_expiry_warning" CHECK ("expiryWarningDays" >= 0);

-- The new default role, and the new permissions for the default roles:
-- the built-in Admin has every permission, the agent sees their own data,
-- the shift lead the team's.
INSERT INTO "Role" ("id", "name", "builtIn", "updatedAt")
SELECT gen_random_uuid()::text, 'Oktatási koordinátor', false, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Role" WHERE "name" = 'Oktatási koordinátor');

INSERT INTO "RolePermission" ("id", "roleId", "permission", "scope")
SELECT gen_random_uuid()::text, r."id", p.permission, p.scope::"PermissionScope"
FROM "Role" r
JOIN (VALUES
  ('Oktatási koordinátor', 'TRAINING_MANAGE', 'ALL'),
  ('Oktatási koordinátor', 'TRAINING_VIEW', 'ALL'),
  ('Műszakvezető', 'TRAINING_VIEW', 'TEAM'),
  ('Ügynök', 'TRAINING_VIEW', 'SELF')
) AS p(role, permission, scope) ON p.role = r."name"
ON CONFLICT ("roleId", "permission") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permission", "scope")
SELECT gen_random_uuid()::text, r."id", p.permission, 'ALL'::"PermissionScope"
FROM "Role" r
CROSS JOIN (VALUES ('TRAINING_MANAGE'), ('TRAINING_VIEW')) AS p(permission)
WHERE r."builtIn"
ON CONFLICT ("roleId", "permission") DO NOTHING;
