import { parseCpm, type CpmData } from "./cpm";
import { bodyLines, parseHeader, type Header } from "./header";
import { parseLdm, type LdmData } from "./ldm";
import { parseMvt, type MvtData } from "./mvt";
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
  | { type: "UCM"; data: UcmData };

export type ParsedMessage = MessageData & { header: Header | null; warnings: TelexWarning[] };

export function parseMessage(message: RawMessage & { type: SupportedType }): ParsedMessage {
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
  }
}
