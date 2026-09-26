// Splitting a received text into messages (docs/messages.md, "Fogadás és
// szétválasztás"). A new message starts where a line is exactly a known type
// code; the lines before the first one (Type B header, email text) are the
// envelope. Pure: the raw text always stays as it came.

/** Types we parse and store. */
export const SUPPORTED_TYPES = ["MVT", "LDM", "CPM", "UCM"] as const;
/** Types we recognise but do not store: they may hold personal data. */
export const UNSUPPORTED_TYPES = ["PTM", "PSM"] as const;

export type SupportedType = (typeof SUPPORTED_TYPES)[number];
export type MessageType = SupportedType | (typeof UNSUPPORTED_TYPES)[number];

const KNOWN: readonly string[] = [...SUPPORTED_TYPES, ...UNSUPPORTED_TYPES];

export const isSupported = (type: MessageType): type is SupportedType =>
  (SUPPORTED_TYPES as readonly string[]).includes(type);

/** The type a line starts, when it is exactly a known type code. */
export function typeOfLine(line: string): MessageType | null {
  const code = line.trim().toUpperCase();
  return KNOWN.includes(code) ? (code as MessageType) : null;
}

export interface RawMessage {
  type: MessageType;
  /** From the type line to the next one, verbatim; trailing empty lines dropped. */
  text: string;
  /** The lines of the text. */
  lines: string[];
}

export interface SplitResult {
  /** The lines before the first type line, when there are any. */
  envelope: string | null;
  messages: RawMessage[];
}

const dropTrailingEmpty = (lines: string[]) => {
  let end = lines.length;
  while (end > 0 && lines[end - 1].trim() === "") end--;
  return lines.slice(0, end);
};

export function splitMessages(text: string): SplitResult {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const starts = lines.flatMap((line, index) => (typeOfLine(line) ? [index] : []));
  if (starts.length === 0) return { envelope: dropTrailingEmpty(lines).join("\n") || null, messages: [] };
  const envelope = dropTrailingEmpty(lines.slice(0, starts[0]));
  return {
    envelope: envelope.some((line) => line.trim() !== "") ? envelope.join("\n") : null,
    messages: starts.map((start, i) => {
      const own = dropTrailingEmpty(lines.slice(start, starts[i + 1] ?? lines.length));
      return { type: typeOfLine(own[0])!, text: own.join("\n"), lines: own };
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
