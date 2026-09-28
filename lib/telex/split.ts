// Splitting a received text into messages (docs/messages.md, "Fogadás és
// szétválasztás"). A new message starts where a line is exactly a known Type B
// type code, with a "COR" line right before it belonging to it as a
// correction, or where a line starts with "-TITLE" (an Eurocontrol slot
// message in ADEXP). The lines before the first one (Type B header, email
// text) are the envelope. Pure: the raw text always stays as it came.

/** Type B types we recognise; a message starts at a line that is exactly one of them. */
export const TYPE_B_TYPES = ["MVT", "LDM", "CPM", "UCM", "PSM", "PTM"] as const;
/** Types we parse and store. */
export const SUPPORTED_TYPES = ["MVT", "LDM", "CPM", "UCM"] as const;

export type TypeBType = (typeof TYPE_B_TYPES)[number];
export type SupportedType = (typeof SUPPORTED_TYPES)[number];
/** A Type B type, or the TITLE of a slot message (SAM, SRM, and others may come). */
export type MessageType = TypeBType | (string & {});

export const isSupported = (type: MessageType): type is SupportedType =>
  (SUPPORTED_TYPES as readonly string[]).includes(type);

/** The type a line starts, when it is exactly a known Type B type code. */
export function typeOfLine(line: string): TypeBType | null {
  const code = line.trim().toUpperCase();
  return (TYPE_B_TYPES as readonly string[]).includes(code) ? (code as TypeBType) : null;
}

/** The TITLE of a slot message, when the line starts one ("-TITLE SAM"). */
export function slotTitleOfLine(line: string): string | null {
  return line.trim().toUpperCase().match(/^-TITLE\s+(\S+)/)?.[1] ?? null;
}

const isCorrectionLine = (line: string) => line.trim().toUpperCase() === "COR";

export interface RawMessage {
  type: MessageType;
  /** Type B, or ADEXP (a slot message). */
  family: "TYPE_B" | "ADEXP";
  /** A "COR" line came before the type line: the message corrects an earlier one. */
  correction: boolean;
  /** The message verbatim, with its COR line; trailing empty lines dropped. */
  text: string;
  /** The lines from the type line (or the -TITLE line) on. */
  lines: string[];
}

export interface SplitResult {
  /** The lines before the first message, when there are any. */
  envelope: string | null;
  messages: RawMessage[];
}

const dropTrailingEmpty = (lines: string[]) => {
  let end = lines.length;
  while (end > 0 && lines[end - 1].trim() === "") end--;
  return lines.slice(0, end);
};

interface Start {
  /** Where the message's text begins: its COR line, if any. */
  from: number;
  /** Its type line or -TITLE line. */
  at: number;
  type: MessageType;
  family: RawMessage["family"];
}

function startsOf(lines: readonly string[]): Start[] {
  const starts: Start[] = [];
  lines.forEach((line, at) => {
    const typeB = typeOfLine(line);
    const title = typeB ? null : slotTitleOfLine(line);
    if (!typeB && !title) return;
    // A COR line right before (empty lines apart) belongs to the message,
    // unless it is itself the start of the previous one.
    let before = at - 1;
    while (before >= 0 && lines[before].trim() === "") before--;
    const previous = starts.at(-1);
    const correction = !!typeB && before >= 0 && isCorrectionLine(lines[before]) && (!previous || before > previous.at);
    starts.push({ from: correction ? before : at, at, type: typeB ?? title!, family: typeB ? "TYPE_B" : "ADEXP" });
  });
  return starts;
}

export function splitMessages(text: string): SplitResult {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const starts = startsOf(lines);
  if (starts.length === 0) return { envelope: dropTrailingEmpty(lines).join("\n") || null, messages: [] };
  const envelope = dropTrailingEmpty(lines.slice(0, starts[0].from));
  return {
    envelope: envelope.some((line) => line.trim() !== "") ? envelope.join("\n") : null,
    messages: starts.map((start, i) => {
      const own = dropTrailingEmpty(lines.slice(start.from, starts[i + 1]?.from ?? lines.length));
      return {
        type: start.type,
        family: start.family,
        correction: start.from !== start.at,
        text: own.join("\n"),
        lines: own.slice(start.at - start.from),
      };
    }),
  };
}

/**
 * The text a duplicate is recognised by: line ends unified, trailing spaces
 * and empty lines around it dropped. Gateways may resend with such changes.
 */
export function normaliseForHash(text: string): string {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd());
  let start = 0;
  while (start < lines.length && lines[start] === "") start++;
  return dropTrailingEmpty(lines.slice(start)).join("\n");
}
