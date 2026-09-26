import { warn, type TelexWarning } from "./warnings";

// UCM, the ULD control message (docs/messages.md, "UCM"): "IN" lists the ULDs
// that came in (the station is where from), "OUT" those that go out (the
// station is where to); items ".PAG72809AGH/OSR/X", several on a line.

export interface UcmItem {
  uld: string;
  station: string | null;
  /** E the base of a stack (equipment), X empty… */
  category: string | null;
}

export interface UcmData {
  /** The header's station. */
  station: string | null;
  direction: "IN" | "OUT" | null;
  items: UcmItem[];
  si: string[];
}

export function parseUcm(fields: readonly string[], body: readonly string[]): { data: UcmData; warnings: TelexWarning[] } {
  const warnings: TelexWarning[] = [];
  const data: UcmData = { station: fields.find((f) => /^[A-Z]{3}$/.test(f)) ?? null, direction: null, items: [], si: [] };
  for (const raw of body) {
    const line = raw.trim().toUpperCase();
    if (line === "IN" || line === "OUT") {
      // One direction per message: its flight part hangs on it.
      if (data.direction && data.direction !== line) warnings.push(warn("mixedDirections"));
      else data.direction = line;
    } else if (line.startsWith(".")) {
      for (const item of line.slice(1).split(".")) {
        const m = item.match(/^([A-Z]{3}\d{4,5}[A-Z0-9]{2,3})(?:\/([A-Z]{3}))?(?:\/([A-Z]))?$/);
        if (m) data.items.push({ uld: m[1], station: m[2] ?? null, category: m[3] ?? null });
        else if (item.trim() !== "") warnings.push(warn("unknownField", { field: item.trim(), line: raw.trim() }));
      }
    } else if (/^SI\b/.test(line)) {
      const text = raw.trim().slice(2).trim();
      if (text) data.si.push(text);
    } else warnings.push(warn("unknownLine", { line: raw.trim() }));
  }
  if (!data.direction) warnings.push(warn("noDirection"));
  return { data, warnings };
}
