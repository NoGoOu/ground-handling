import type { ParsedMessage } from "./parse";
import { derivedText } from "./psm";
import { normaliseForHash, type RawMessage } from "./split";

// What a received message is stored as (CLAUDE.md, 8. mérföldkő). The raw
// text always stays, with its envelope, except for the PSM and the PTM: they
// carry names, so in place of the raw text and its hash there are the counts
// derived from them, and no envelope. Pure.

export interface StoredForm {
  rawText: string;
  envelope: string | null;
  /** What the duplicate hash is made of. */
  hashSource: string;
}

export function storedForm(raw: RawMessage, parsed: ParsedMessage, envelope: string | null): StoredForm {
  if (parsed.type === "PSM" || parsed.type === "PTM") {
    const text = derivedText(parsed.type, parsed.header, parsed.data);
    return { rawText: text, envelope: null, hashSource: text };
  }
  return { rawText: raw.text, envelope, hashSource: normaliseForHash(raw.text) };
}
