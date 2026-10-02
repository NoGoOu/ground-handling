// The subscription link is made from the server's public address, which the
// operator gives in APP_PUBLIC_URL (CLAUDE.md, 12. mérföldkő, "Üzemeltetés").
// Calendars fetch it from their own servers, so it has to be HTTPS; plain HTTP
// is accepted on this machine only, for development.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** The base of the subscription links without a trailing slash; null when unset or unusable. */
export function publicBaseUrl(value: string | undefined): string | null {
  const text = value?.trim();
  if (!text) return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  const secure = url.protocol === "https:" || (url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname));
  if (!secure || url.search || url.hash || url.username || url.password) return null;
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
}

/** The link a calendar subscribes to: https, ending in .ics. */
export function feedUrl(base: string, key: string): string {
  return `${base}/api/calendar/${key}.ics`;
}

/** The key from the last part of the link ("<key>.ics"), or null. */
export function keyFromFileName(file: string): string | null {
  return /^([A-Za-z0-9_-]{20,100})\.ics$/.exec(file)?.[1] ?? null;
}
