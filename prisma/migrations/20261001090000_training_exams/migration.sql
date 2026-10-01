-- CreateEnum
CREATE TYPE "ExamQuestionKind" AS ENUM ('SINGLE', 'MULTIPLE', 'TEXT');

-- CreateEnum
CREATE TYPE "MultipleChoiceScoring" AS ENUM ('ALL_OR_NOTHING', 'PROPORTIONAL');

-- CreateEnum
CREATE TYPE "TrainingProcessStatus" AS ENUM ('IN_PROGRESS', 'RELEASED', 'ABORTED');

-- CreateEnum
CREATE TYPE "Verdict" AS ENUM ('PASS', 'FAIL');

-- AlterTable
ALTER TABLE "MilestoneRecord" ADD COLUMN     "byTrainee" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedByTrainee" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Training" ADD COLUMN     "ojtMinCompletenessPercent" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "ojtMinOnTimePercent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ojtRequiredCount" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "practicalPart" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "theoryPart" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ExamQuestion" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "kind" "ExamQuestionKind" NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "topic" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ExamOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSheet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "timeLimitMinutes" INTEGER,
    "multipleScoring" "MultipleChoiceScoring" NOT NULL DEFAULT 'ALL_OR_NOTHING',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSheetQuestion" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "ExamSheetQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingProcess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "status" "TrainingProcessStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "openKey" TEXT,
    "startedById" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "abortedById" TEXT,
    "abortedAt" TIMESTAMP(3),
    "abortReason" TEXT,
    "releasedById" TEXT,
    "releasedAt" TIMESTAMP(3),
    "recordId" TEXT,

    CONSTRAINT "TrainingProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamAttempt" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "maxPoints" INTEGER NOT NULL,
    "openKey" TEXT,
    "openedById" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "scoredPoints" DOUBLE PRECISION,
    "passed" BOOLEAN,
    "feedback" TEXT,
    "internalNote" TEXT,
    "gradedById" TEXT,
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "ExamAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionIndex" INTEGER NOT NULL,
    "choices" INTEGER[],
    "text" TEXT,
    "points" DOUBLE PRECISION,
    "graderNote" TEXT,
    "gradedById" TEXT,
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "ExamAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OjtSession" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "part" "MilestonePart" NOT NULL,
    "traineeId" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verdict" "Verdict",
    "comment" TEXT,
    "metrics" JSONB,
    "mentorId" TEXT,
    "evaluatedAt" TIMESTAMP(3),

    CONSTRAINT "OjtSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticalCriterion" (
    "id" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticalCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticalExam" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "part" "MilestonePart" NOT NULL,
    "examinerId" TEXT NOT NULL,
    "results" JSONB NOT NULL,
    "verdict" "Verdict" NOT NULL,
    "feedback" TEXT,
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticalExam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamOption_questionId_order_key" ON "ExamOption"("questionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSheet_name_key" ON "ExamSheet"("name");

-- CreateIndex
CREATE INDEX "ExamSheetQuestion_sheetId_idx" ON "ExamSheetQuestion"("sheetId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSheetQuestion_sheetId_questionId_key" ON "ExamSheetQuestion"("sheetId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingProcess_openKey_key" ON "TrainingProcess"("openKey");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingProcess_recordId_key" ON "TrainingProcess"("recordId");

-- CreateIndex
CREATE INDEX "TrainingProcess_userId_idx" ON "TrainingProcess"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamAttempt_openKey_key" ON "ExamAttempt"("openKey");

-- CreateIndex
CREATE INDEX "ExamAttempt_processId_idx" ON "ExamAttempt"("processId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamAnswer_attemptId_questionIndex_key" ON "ExamAnswer"("attemptId", "questionIndex");

-- CreateIndex
CREATE INDEX "OjtSession_traineeId_idx" ON "OjtSession"("traineeId");

-- CreateIndex
CREATE INDEX "OjtSession_processId_idx" ON "OjtSession"("processId");

-- CreateIndex
CREATE UNIQUE INDEX "OjtSession_taskId_part_key" ON "OjtSession"("taskId", "part");

-- CreateIndex
CREATE INDEX "PracticalCriterion_trainingId_idx" ON "PracticalCriterion"("trainingId");

-- CreateIndex
CREATE INDEX "PracticalExam_processId_idx" ON "PracticalExam"("processId");

-- AddForeignKey
ALTER TABLE "ExamOption" ADD CONSTRAINT "ExamOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ExamQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSheet" ADD CONSTRAINT "ExamSheet_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "Training"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSheetQuestion" ADD CONSTRAINT "ExamSheetQuestion_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "ExamSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSheetQuestion" ADD CONSTRAINT "ExamSheetQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ExamQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingProcess" ADD CONSTRAINT "TrainingProcess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingProcess" ADD CONSTRAINT "TrainingProcess_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "Training"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingProcess" ADD CONSTRAINT "TrainingProcess_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingProcess" ADD CONSTRAINT "TrainingProcess_abortedById_fkey" FOREIGN KEY ("abortedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingProcess" ADD CONSTRAINT "TrainingProcess_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingProcess" ADD CONSTRAINT "TrainingProcess_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "TrainingRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_processId_fkey" FOREIGN KEY ("processId") REFERENCES "TrainingProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "ExamSheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_gradedById_fkey" FOREIGN KEY ("gradedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAnswer" ADD CONSTRAINT "ExamAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAnswer" ADD CONSTRAINT "ExamAnswer_gradedById_fkey" FOREIGN KEY ("gradedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OjtSession" ADD CONSTRAINT "OjtSession_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OjtSession" ADD CONSTRAINT "OjtSession_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OjtSession" ADD CONSTRAINT "OjtSession_processId_fkey" FOREIGN KEY ("processId") REFERENCES "TrainingProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OjtSession" ADD CONSTRAINT "OjtSession_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OjtSession" ADD CONSTRAINT "OjtSession_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalCriterion" ADD CONSTRAINT "PracticalCriterion_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "Training"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalExam" ADD CONSTRAINT "PracticalExam_processId_fkey" FOREIGN KEY ("processId") REFERENCES "TrainingProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalExam" ADD CONSTRAINT "PracticalExam_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalExam" ADD CONSTRAINT "PracticalExam_examinerId_fkey" FOREIGN KEY ("examinerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Rules the database keeps (CLAUDE.md, 10. mérföldkő).

-- A theory part is closed by an e-exam: it needs the exam and its pass mark.
ALTER TABLE "Training" ADD CONSTRAINT "Training_theory_needs_exam" CHECK (NOT "theoryPart" OR ("hasExam" AND "passPercent" IS NOT NULL));
ALTER TABLE "Training" ADD CONSTRAINT "Training_ojt_requirement" CHECK (
  "ojtRequiredCount" >= 1
  AND "ojtMinCompletenessPercent" BETWEEN 0 AND 100
  AND "ojtMinOnTimePercent" BETWEEN 0 AND 100
);
ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_points" CHECK ("points" >= 1);
ALTER TABLE "ExamSheet" ADD CONSTRAINT "ExamSheet_time_limit" CHECK ("timeLimitMinutes" IS NULL OR "timeLimitMinutes" >= 1);
ALTER TABLE "ExamAnswer" ADD CONSTRAINT "ExamAnswer_points" CHECK ("points" IS NULL OR "points" >= 0);

-- One open process per agent and training, and one open attempt per process:
-- the key is set exactly while it is open.
ALTER TABLE "TrainingProcess" ADD CONSTRAINT "TrainingProcess_open_key" CHECK (("status" = 'IN_PROGRESS') = ("openKey" IS NOT NULL));
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_open_key" CHECK (("submittedAt" IS NULL) = ("openKey" IS NOT NULL));

-- The new default roles; the coordinator edits exams, examines and releases.
INSERT INTO "Role" ("id", "name", "builtIn", "updatedAt")
SELECT gen_random_uuid()::text, v."name", false, CURRENT_TIMESTAMP
FROM (VALUES ('Mentor'), ('Vizsgáztató')) AS v("name")
WHERE NOT EXISTS (SELECT 1 FROM "Role" WHERE "name" = v."name");

INSERT INTO "RolePermission" ("id", "roleId", "permission", "scope")
SELECT gen_random_uuid()::text, r."id", p.permission, 'ALL'::"PermissionScope"
FROM "Role" r
JOIN (VALUES
  ('Mentor', 'MENTORING'),
  ('Vizsgáztató', 'EXAMINING'),
  ('Oktatási koordinátor', 'EXAM_EDIT'),
  ('Oktatási koordinátor', 'EXAMINING'),
  ('Oktatási koordinátor', 'RELEASE')
) AS p(role, permission) ON p.role = r."name"
ON CONFLICT ("roleId", "permission") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permission", "scope")
SELECT gen_random_uuid()::text, r."id", p.permission, 'ALL'::"PermissionScope"
FROM "Role" r
CROSS JOIN (VALUES ('EXAM_EDIT'), ('MENTORING'), ('EXAMINING'), ('RELEASE')) AS p(permission)
WHERE r."builtIn"
ON CONFLICT ("roleId", "permission") DO NOTHING;
