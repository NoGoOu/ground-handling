import { headerFingerprint } from "./fingerprint";
import type { ImportMapping } from "./mapping";
import { tableFrom, type ParsedFile } from "./read";

// Offering a saved profile: a profile fits a file when the file has the
// profile's sheet, and the header in the profile's header row is the same
// (3. mérföldkő: "azonos fejlécnél a rendszer felajánlja").

export interface StoredProfile {
  id: string;
  name: string;
  headerFingerprint: string;
  mapping: ImportMapping;
}

export function profileFits(file: ParsedFile, profile: StoredProfile): boolean {
  const sheet = file.sheets.find((s) => s.name === profile.mapping.sheet);
  if (!sheet) return false;
  const { headers } = tableFrom(sheet.rows, profile.mapping.headerRow - 1);
  return headers.length > 0 && headerFingerprint(headers) === profile.headerFingerprint;
}

/** The first profile (in the given order) that fits the file. */
export function matchProfile<P extends StoredProfile>(file: ParsedFile, profiles: readonly P[]): P | null {
  return profiles.find((profile) => profileFits(file, profile)) ?? null;
}
