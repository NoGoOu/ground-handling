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

/** The SI text without its "SI" prefix, e.g. for a one-line SI. */
export const siText = (si: string | null) => (si ? si.replace(/^\s*SI\b\s?/i, "") : "");
