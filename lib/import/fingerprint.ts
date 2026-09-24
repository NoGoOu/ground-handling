import { createHash } from "node:crypto";

// A file's header, reduced to a hash: a saved profile is offered again for a
// file with the same header (3. mérföldkő). Case, spacing and the sheet do not
// matter, the column order does.

export function normaliseHeader(header: string): string {
  return header.trim().replace(/\s+/g, " ").toLowerCase();
}

export function headerFingerprint(headers: readonly string[]): string {
  return createHash("sha256").update(headers.map(normaliseHeader).join("\u001f")).digest("hex");
}
