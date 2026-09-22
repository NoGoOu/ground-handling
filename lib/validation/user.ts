import { z } from "zod";
import { Role } from "@/generated/prisma/enums";
import { messages } from "@/lib/messages";

const e = messages.userForm.errors;

export const USER_FIELDS = ["name", "username", "role", "password", "active"] as const;
export type UserFormInput = Record<(typeof USER_FIELDS)[number], string>;

const base = {
  name: z.string().trim().min(1, e.name).max(100, e.name),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.string().regex(/^[a-z0-9._-]{3,32}$/, e.username)),
  role: z.enum(Object.values(Role) as [Role, ...Role[]], { error: e.role }),
  // Checkbox: "on" when ticked, "" when not.
  active: z.string().transform((value) => value === "on"),
};

export const newUserSchema = z.object({
  ...base,
  password: z.string().min(8, e.password),
});

export const editUserSchema = z.object({
  ...base,
  // Empty means "keep the current password".
  password: z
    .string()
    .refine((value) => value === "" || value.length >= 8, e.password)
    .transform((value) => (value === "" ? null : value)),
});

/** An admin must not lock themselves out by deactivating or demoting their own account. */
export function isSelfLockout(
  actor: { id: string },
  target: { id: string },
  change: { role: Role; active: boolean },
): boolean {
  return actor.id === target.id && (change.role !== "ADMIN" || !change.active);
}
