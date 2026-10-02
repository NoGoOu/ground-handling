import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { LoginLocked } from "@/lib/auth-errors";
import { recentLoginAttempts, recordLoginAttempt } from "@/lib/data/login-attempts";
import { prisma } from "@/lib/db";
import { clientIp, loginLockedUntil, minutesLeft } from "@/lib/ops/rate-limit";

const credentialsSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { username: {}, password: {} },
      // Every attempt is logged; too many failures lock the user name or the
      // address for a while (13. mérföldkő). Checked here, so a direct call of
      // the Auth.js endpoint is limited as well as the sign-in form.
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { username, password } = parsed.data;
        const ip = clientIp(request.headers);
        const now = new Date();
        const until = loginLockedUntil(await recentLoginAttempts(username, ip, now), username, ip, now);
        if (until) {
          await recordLoginAttempt(username, ip, "BLOCKED");
          console.warn(`Sign-in refused (too many failures): user name "${username}", address ${ip}`);
          throw new LoginLocked(minutesLeft(until, now));
        }
        const user = await prisma.user.findUnique({ where: { username } });
        const valid = !!user?.active && (await bcrypt.compare(password, user.passwordHash));
        await recordLoginAttempt(username, ip, valid ? "SUCCESS" : "FAILURE");
        return valid && user ? { id: user.id, name: user.name } : null;
      },
    }),
  ],
});
