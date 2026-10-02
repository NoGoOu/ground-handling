-- The agent sees their own roster (CLAUDE.md, 12. mérföldkő): the default
-- Ügynök role gets "Beosztás megtekintése" with its own scope.
INSERT INTO "RolePermission" ("id", "roleId", "permission", "scope")
SELECT gen_random_uuid()::text, r."id", 'ROSTER_VIEW', 'SELF'::"PermissionScope"
FROM "Role" r
WHERE r."name" = 'Ügynök'
ON CONFLICT ("roleId", "permission") DO NOTHING;
