import { messages } from "@/lib/messages";
import { formatDateTime } from "@/lib/time";

// The running version (CLAUDE.md, 13. mérföldkő, "Frissítés"): the commit and
// the build date, baked into the image when it is built. "unknown" outside a
// production build.

export interface AppVersion {
  commit: string;
  date: string;
}

/** "a4ae87d (2026. 10. 02. 12:30)", or "ismeretlen" outside a production build. */
export function formatVersion(version: AppVersion): string {
  if (version.commit === "unknown") return messages.ops.adminPage.unknownVersion;
  const date = new Date(version.date);
  return Number.isNaN(date.getTime()) ? version.commit : `${version.commit} (${formatDateTime(date)})`;
}

export function appVersion(env: Readonly<Record<string, string | undefined>> = process.env): AppVersion {
  return {
    commit: env.APP_COMMIT?.trim() || "unknown",
    date: env.APP_BUILD_DATE?.trim() || "unknown",
  };
}
