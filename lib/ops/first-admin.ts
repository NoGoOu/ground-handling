import bcrypt from "bcryptjs";
import { z } from "zod";
import { countActiveAdmins } from "@/lib/data/users";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { BUILT_IN_ADMIN_ROLE } from "@/lib/permissions";
import { BUD_STATION_ID } from "@/lib/stations";
import { newUserSchema } from "@/lib/validation/user";

// The first admin of a production server (CLAUDE.md, 13. mérföldkő): there is
// no demo data there, so a one-off command makes the first user. It refuses
// once an active admin exists; the rest are made on the admin pages.

const firstAdminSchema = newUserSchema.pick({ name: true, username: true, password: true });

export type FirstAdminInput = z.input<typeof firstAdminSchema>;

/** The checked input, or the first problem in the words of the user form. */
export function parseFirstAdmin(input: FirstAdminInput): { ok: true; data: z.output<typeof firstAdminSchema> } | { ok: false; error: string } {
  const parsed = firstAdminSchema.safeParse(input);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, error: parsed.error.issues[0].message };
}

export async function hasActiveAdmin(): Promise<boolean> {
  return (await countActiveAdmins()) > 0;
}

export async function createFirstAdmin(input: FirstAdminInput): Promise<{ ok: true; username: string } | { ok: false; error: string }> {
  const parsed = parseFirstAdmin(input);
  if (!parsed.ok) return parsed;
  if (await hasActiveAdmin()) return { ok: false, error: messages.ops.admin.exists };
  const { name, username, password } = parsed.data;
  if (await prisma.user.findUnique({ where: { username }, select: { id: true } })) return { ok: false, error: messages.ops.admin.taken };
  const role = await prisma.role.findFirstOrThrow({ where: { name: BUILT_IN_ADMIN_ROLE, builtIn: true }, select: { id: true } });
  await prisma.user.create({
    // The first admin is for every station (no station on the role, 14. mérföldkő).
    data: {
      name,
      username,
      passwordHash: await bcrypt.hash(password, 10),
      defaultStationId: BUD_STATION_ID,
      roles: { create: [{ roleId: role.id, stationId: null }] },
    },
  });
  return { ok: true, username };
}
