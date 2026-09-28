import { parseCpm, type CpmData } from "./cpm";
import { bodyLines, parseHeader, type Header } from "./header";
import { parseLdm, type LdmData } from "./ldm";
import { parseMvt, type MvtData } from "./mvt";
import { parsePersonalHeader, parsePsm, parsePtm, type PsmData, type PtmData } from "./psm";
import type { RawMessage, SupportedType } from "./split";
import { parseUcm, type UcmData } from "./ucm";
import { warn, type TelexWarning } from "./warnings";

// One message, parsed by its type (docs/messages.md). Tolerant: an unknown
// line gives a warning and the rest is still read; the raw text is kept by
// whoever stores the result.

export type MessageData =
  | { type: "MVT"; data: MvtData }
  | { type: "LDM"; data: LdmData }
  | { type: "CPM"; data: CpmData }
  | { type: "UCM"; data: UcmData }
  | { type: "PSM"; data: PsmData }
  | { type: "PTM"; data: PtmData };

export type ParsedMessage = MessageData & { header: Header | null; warnings: TelexWarning[] };

/** PSM and PTM: a header of their own, and only counts from the body. */
function parsePersonal(type: "PSM" | "PTM", lines: readonly string[]): ParsedMessage {
  const [headerLine, ...body] = bodyLines(lines);
  const personal = headerLine === undefined ? null : parsePersonalHeader(headerLine);
  if (!personal) {
    // The line is not quoted: it may hold a name.
    const warnings = [warn(headerLine === undefined ? "noHeader" : "unreadHeader")];
    const empty = type === "PSM" ? { station: "", part: 0, last: false, destinations: [] } : { from: "", to: null, part: 0, last: false, transfers: [] };
    return { type, header: null, data: empty, warnings } as ParsedMessage;
  }
  const header: Header = {
    flightNumber: personal.flightNumber,
    dateText: personal.dateText,
    date: { day: personal.day, month: personal.month },
    registration: null,
    fields: [`${personal.from}${personal.to ?? ""}`, `PART${personal.part}`],
  };
  if (type === "PSM") {
    const parsed = parsePsm(personal, body);
    return { type, header, data: parsed.data, warnings: parsed.warnings };
  }
  const parsed = parsePtm(personal, body);
  return { type, header, data: parsed.data, warnings: parsed.warnings };
}

export function parseMessage(message: RawMessage & { type: SupportedType }): ParsedMessage {
  if (message.type === "PSM" || message.type === "PTM") return parsePersonal(message.type, message.lines);
  const [headerLine, ...body] = bodyLines(message.lines);
  const header = headerLine === undefined ? null : parseHeader(headerLine);
  const warnings: TelexWarning[] = [];
  if (headerLine === undefined) warnings.push(warn("noHeader"));
  else if (!header) warnings.push(warn("badHeader", { line: headerLine.trim() }));
  const fields = header?.fields ?? [];
  switch (message.type) {
    case "MVT": {
      const parsed = parseMvt(fields, body);
      return { type: "MVT", header, data: parsed.data, warnings: [...warnings, ...parsed.warnings] };
    }
    case "LDM": {
      const parsed = parseLdm(fields, body);
      return { type: "LDM", header, data: parsed.data, warnings: [...warnings, ...parsed.warnings] };
    }
    case "CPM": {
      const parsed = parseCpm(fields, body);
      return { type: "CPM", header, data: parsed.data, warnings: [...warnings, ...parsed.warnings] };
    }
    case "UCM": {
      const parsed = parseUcm(fields, body);
      return { type: "UCM", header, data: parsed.data, warnings: [...warnings, ...parsed.warnings] };
    }
    default:
      throw new Error(`Not a Type B type with a common header: ${message.type}`);
  }
}
