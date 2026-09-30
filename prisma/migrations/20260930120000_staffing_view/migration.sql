-- "Létszámigény megtekintése" (CLAUDE.md, 9. mérföldkő): by default the
-- planner, the shift lead and the admin; the built-in Admin has every permission.
INSERT INTO "RolePermission" ("id", "roleId", "permission", "scope")
SELECT gen_random_uuid()::text, r."id", 'STAFFING_VIEW', 'ALL'::"PermissionScope"
FROM "Role" r
WHERE r."builtIn" OR r."name" IN ('Tervező', 'Műszakvezető')
ON CONFLICT ("roleId", "permission") DO NOTHING;
