import { CredentialsSignin } from "next-auth";
import { lockedCode, minutesFromCode } from "@/lib/ops/rate-limit";

// A sign-in refused for too many failures (CLAUDE.md, 13. mérföldkő). The
// code carries the minutes to wait to the sign-in form; it never tells whether
// the user name exists.

export class LoginLocked extends CredentialsSignin {
  constructor(minutes: number) {
    super();
    this.code = lockedCode(minutes);
  }
}

/** The minutes to wait from a refused sign-in, or null for any other error. */
export function lockedMinutes(error: unknown): number | null {
  return error instanceof CredentialsSignin ? minutesFromCode(error.code) : null;
}
