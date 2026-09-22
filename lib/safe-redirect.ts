/** Only same-origin relative paths are allowed as post-login targets. */
export function safeCallbackPath(value: unknown): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
