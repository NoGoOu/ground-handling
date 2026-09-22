import type { DefaultSession } from "next-auth";
import type { Role } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
  }
}

// next-auth/jwt only re-exports this module, so the augmentation has to target it directly.
declare module "@auth/core/jwt" {
  interface JWT {
    role?: Role;
  }
}
