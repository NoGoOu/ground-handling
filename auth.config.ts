import type { NextAuthConfig } from "next-auth";

// Shared by auth.ts and proxy.ts. The token only identifies the user; the
// permissions are read from the database on every request.
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
