// SI is free text (CLAUDE.md, 8. mérföldkő: "Az SI-t nem dolgozzuk fel").
// From the first SI line to the end of the message (for a CPM to CPM END)
// every line is kept verbatim and shown as it is, without warnings; it may
// carry a framed operating instruction or a DAA line.

export interface SiSplit {
  /** The body before the SI. */
  body: string[];
  /** The SI block verbatim, from its SI line; null without one. */
  si: string | null;
  /** Lines after the stop line (e.g. CPM END), which belong to no part. */
  after: string[];
}

const isSiLine = (line: string) => /^SI\b/i.test(line.trim());

export function splitSi(lines: readonly string[], stop?: (line: string) => boolean): SiSplit {
  const stopAt = stop ? lines.findIndex(stop) : -1;
  const own = stopAt >= 0 ? lines.slice(0, stopAt) : [...lines];
  const after = stopAt >= 0 ? lines.slice(stopAt + 1) : [];
  const siAt = own.findIndex(isSiLine);
  if (siAt < 0) return { body: own, si: null, after };
  const si = own.slice(siAt).map((line) => line.trimEnd()).join("\n").trimEnd();
  return { body: own.slice(0, siAt), si, after };
}

export type SiLineKind = "frame" | "instruction" | "daa" | "plain";

/** A row of asterisks opens or closes a framed operating instruction. */
const FRAME = /^\s*\*{5,}\s*$/;
/** "DAA/52/2/BUD//2 STROLLER.": delivery at the aircraft, for the arrival agent. */
const DAA = /\bDAA\//;

/** Each SI line with how it is shown: a frame of asterisks, a line inside one, a DAA, or plain. */
export function siLines(text: string): { line: string; kind: SiLineKind }[] {
  const result: { line: string; kind: SiLineKind }[] = [];
  let framed = false;
  for (const line of text.split("\n")) {
    if (FRAME.test(line)) {
      framed = !framed;
      result.push({ line, kind: "frame" });
    } else result.push({ line, kind: framed ? "instruction" : DAA.test(line) ? "daa" : "plain" });
  }
  return result;
}
