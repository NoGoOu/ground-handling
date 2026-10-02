// The running version (CLAUDE.md, 13. mérföldkő, "Frissítés"): the commit and
// the build date, baked into the image when it is built. "unknown" outside a
// production build.

export interface AppVersion {
  commit: string;
  date: string;
}

export function appVersion(env: Readonly<Record<string, string | undefined>> = process.env): AppVersion {
  return {
    commit: env.APP_COMMIT?.trim() || "unknown",
    date: env.APP_BUILD_DATE?.trim() || "unknown",
  };
}
