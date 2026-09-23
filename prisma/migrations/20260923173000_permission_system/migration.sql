-- Permission system (CLAUDE.md, "Jogosultsági rendszer").
-- The old User.role column is dropped only after the existing users have been
-- moved to the default roles, so their behaviour stays the same.

-- The old Role enum has to step aside: a table of the same name would clash
-- with it. It is dropped at the end, once the data has been migrated.
ALTER TYPE "Role" RENAME TO "RoleEnumOld";

-- CreateEnum
CREATE TYPE "PermissionScope" AS ENUM ('SELF', 'TEAM', 'ALL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "teamId" TEXT;

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "builtIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "scope" "PermissionScope" NOT NULL DEFAULT 'ALL',

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "scope" "PermissionScope" NOT NULL DEFAULT 'ALL',

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permission_key" ON "RolePermission"("roleId", "permission");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_permission_key" ON "UserPermission"("userId", "permission");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Data migration: the default roles
INSERT INTO "Role" ("id", "name", "builtIn", "createdAt", "updatedAt") VALUES
    (gen_random_uuid()::text, 'Admin', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Tervező', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Műszakvezető', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Ügynök', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Data migration: the permissions ticked for each default role
INSERT INTO "RolePermission" ("id", "roleId", "permission", "scope")
SELECT gen_random_uuid()::text, r."id", grant_list."permission", grant_list."scope"::"PermissionScope"
FROM (VALUES
    ('Admin', 'TASK_VIEW', 'ALL'),
    ('Admin', 'TASK_RECORD', 'ALL'),
    ('Admin', 'TASK_STATUS', 'ALL'),
    ('Admin', 'TASK_ASSIGN', 'ALL'),
    ('Admin', 'FLIGHT_MANAGE', 'ALL'),
    ('Admin', 'BOARD_VIEW', 'ALL'),
    ('Admin', 'ROSTER_VIEW', 'ALL'),
    ('Admin', 'ROSTER_DRAFT', 'ALL'),
    ('Admin', 'ROSTER_PUBLISH', 'ALL'),
    ('Admin', 'ROSTER_ACTUAL_EDIT', 'ALL'),
    ('Admin', 'SEGMENT_TYPE_MANAGE', 'ALL'),
    ('Admin', 'USER_MANAGE', 'ALL'),
    ('Admin', 'ROLE_MANAGE', 'ALL'),
    ('Admin', 'TEAM_MANAGE', 'ALL'),
    ('Admin', 'AIRLINE_MANAGE', 'ALL'),
    ('Admin', 'SETTINGS_MANAGE', 'ALL'),
    ('Tervező', 'BOARD_VIEW', 'ALL'),
    ('Tervező', 'ROSTER_VIEW', 'ALL'),
    ('Tervező', 'ROSTER_DRAFT', 'ALL'),
    ('Tervező', 'ROSTER_PUBLISH', 'ALL'),
    ('Tervező', 'ROSTER_ACTUAL_EDIT', 'ALL'),
    ('Tervező', 'SEGMENT_TYPE_MANAGE', 'ALL'),
    ('Műszakvezető', 'TASK_VIEW', 'ALL'),
    ('Műszakvezető', 'TASK_RECORD', 'ALL'),
    ('Műszakvezető', 'TASK_STATUS', 'ALL'),
    ('Műszakvezető', 'TASK_ASSIGN', 'ALL'),
    ('Műszakvezető', 'FLIGHT_MANAGE', 'ALL'),
    ('Műszakvezető', 'BOARD_VIEW', 'ALL'),
    ('Műszakvezető', 'ROSTER_VIEW', 'ALL'),
    ('Műszakvezető', 'ROSTER_ACTUAL_EDIT', 'ALL'),
    ('Ügynök', 'TASK_VIEW', 'SELF'),
    ('Ügynök', 'TASK_RECORD', 'SELF'),
    ('Ügynök', 'TASK_STATUS', 'SELF')
) AS grant_list("role", "permission", "scope")
JOIN "Role" r ON r."name" = grant_list."role";

-- Data migration: every user keeps their current role
INSERT INTO "UserRole" ("userId", "roleId")
SELECT u."id", r."id"
FROM "User" u
JOIN "Role" r ON r."name" = CASE u."role"::text
    WHEN 'ADMIN' THEN 'Admin'
    WHEN 'SHIFT_LEAD' THEN 'Műszakvezető'
    WHEN 'AGENT' THEN 'Ügynök'
END;

-- Data migration: the agents go into a demo team led by the shift lead
INSERT INTO "Team" ("id", "name", "leaderId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'Demo csapat', u."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User" u
WHERE u."role"::text = 'SHIFT_LEAD'
ORDER BY u."createdAt"
LIMIT 1;

UPDATE "User"
SET "teamId" = (SELECT "id" FROM "Team" WHERE "name" = 'Demo csapat')
WHERE "role"::text = 'AGENT'
  AND EXISTS (SELECT 1 FROM "Team" WHERE "name" = 'Demo csapat');

-- The old column and enum are no longer needed
ALTER TABLE "User" DROP COLUMN "role";

-- DropEnum
DROP TYPE "RoleEnumOld";
