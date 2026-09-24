// The list of permissions lives in code (CLAUDE.md, "Jogosultsági rendszer").
// Roles and individual grants in the database point at these keys.

export const SCOPES = ["SELF", "TEAM", "ALL"] as const;
export type Scope = (typeof SCOPES)[number];

/** Wider scopes come later in SCOPES; the widest grant wins. */
export function widerScope(a: Scope, b: Scope): Scope {
  return SCOPES.indexOf(a) >= SCOPES.indexOf(b) ? a : b;
}

export const SCOPE_LABELS: Record<Scope, string> = {
  SELF: "Saját",
  TEAM: "Csapat",
  ALL: "Összes",
};

interface PermissionInfo {
  label: string;
  /** Whether a scope (own / team / all) is meaningful for this permission. */
  scoped: boolean;
  group: string;
}

export const PERMISSIONS = {
  TASK_VIEW: { label: "Taskok megtekintése", scoped: true, group: "Taskok" },
  TASK_RECORD: { label: "Mérföldkő rögzítése", scoped: true, group: "Taskok" },
  TASK_STATUS: { label: "Task státuszának váltása", scoped: true, group: "Taskok" },
  TASK_ASSIGN: { label: "Task kiosztása", scoped: true, group: "Taskok" },
  FLIGHT_MANAGE: { label: "Járatok kezelése", scoped: false, group: "Járatok" },
  SCHEDULE_IMPORT: { label: "Járatrend importálása", scoped: false, group: "Járatok" },
  BOARD_VIEW: { label: "Sávos nézet megtekintése", scoped: false, group: "Beosztás" },
  ROSTER_VIEW: { label: "Beosztás megtekintése", scoped: true, group: "Beosztás" },
  ROSTER_DRAFT: { label: "Beosztás tervezése", scoped: false, group: "Beosztás" },
  ROSTER_PUBLISH: { label: "Beosztás publikálása", scoped: false, group: "Beosztás" },
  ROSTER_ACTUAL_EDIT: { label: "Valós beosztás szerkesztése", scoped: false, group: "Beosztás" },
  SEGMENT_TYPE_MANAGE: { label: "Műszakrész-típusok kezelése", scoped: false, group: "Beosztás" },
  USER_MANAGE: { label: "Felhasználók kezelése", scoped: false, group: "Adminisztráció" },
  ROLE_MANAGE: { label: "Szerepkörök kezelése", scoped: false, group: "Adminisztráció" },
  TEAM_MANAGE: { label: "Csapatok kezelése", scoped: false, group: "Adminisztráció" },
  AIRLINE_MANAGE: { label: "Légitársaságok és sablonok kezelése", scoped: false, group: "Adminisztráció" },
  SETTINGS_MANAGE: { label: "Beállítások kezelése", scoped: false, group: "Adminisztráció" },
} as const satisfies Record<string, PermissionInfo>;

export type Permission = keyof typeof PERMISSIONS;

export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as Permission[];

export function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && value in PERMISSIONS;
}

export function isScope(value: unknown): value is Scope {
  return typeof value === "string" && (SCOPES as readonly string[]).includes(value);
}

/** Permissions grouped for the admin matrix, in catalog order. */
export function permissionGroups(): { group: string; permissions: Permission[] }[] {
  const groups: { group: string; permissions: Permission[] }[] = [];
  for (const key of PERMISSION_KEYS) {
    const { group } = PERMISSIONS[key];
    const existing = groups.find((g) => g.group === group);
    if (existing) existing.permissions.push(key);
    else groups.push({ group, permissions: [key] });
  }
  return groups;
}

/** The default roles the seed and the migration create. */
export const BUILT_IN_ADMIN_ROLE = "Admin";

export const DEFAULT_ROLES: { name: string; builtIn: boolean; permissions: Partial<Record<Permission, Scope>> }[] = [
  {
    name: BUILT_IN_ADMIN_ROLE,
    builtIn: true,
    permissions: Object.fromEntries(PERMISSION_KEYS.map((key) => [key, "ALL"])) as Record<Permission, Scope>,
  },
  {
    name: "Tervező",
    builtIn: false,
    permissions: {
      BOARD_VIEW: "ALL",
      ROSTER_VIEW: "ALL",
      ROSTER_DRAFT: "ALL",
      ROSTER_PUBLISH: "ALL",
      ROSTER_ACTUAL_EDIT: "ALL",
      SEGMENT_TYPE_MANAGE: "ALL",
      SCHEDULE_IMPORT: "ALL",
    },
  },
  {
    name: "Műszakvezető",
    builtIn: false,
    permissions: {
      TASK_VIEW: "ALL",
      TASK_RECORD: "ALL",
      TASK_STATUS: "ALL",
      TASK_ASSIGN: "ALL",
      FLIGHT_MANAGE: "ALL",
      BOARD_VIEW: "ALL",
      ROSTER_VIEW: "ALL",
      ROSTER_ACTUAL_EDIT: "ALL",
    },
  },
  {
    name: "Ügynök",
    builtIn: false,
    permissions: {
      TASK_VIEW: "SELF",
      TASK_RECORD: "SELF",
      TASK_STATUS: "SELF",
    },
  },
];
