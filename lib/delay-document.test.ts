import { describe, expect, it } from "vitest";
import { checkDelayDocument, documentEvents, MAX_DELAY_DOCUMENT_BYTES, type DocumentLogRow } from "@/lib/delay-document";

const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

describe("the delay code document of an airline", () => {
  it("takes a PDF, known by its first bytes", () => {
    expect(checkDelayDocument(new Uint8Array(PDF))).toEqual({ ok: true });
  });

  it("refuses an image, although a training record takes one", () => {
    expect(checkDelayDocument(new Uint8Array(PNG))).toEqual({ ok: false, problem: "type" });
  });

  it("refuses a file that only has the name of a PDF", () => {
    expect(checkDelayDocument(new TextEncoder().encode("<html>kodok.pdf</html>"))).toEqual({ ok: false, problem: "type" });
  });

  it("refuses an empty file and one over 10 MB", () => {
    expect(checkDelayDocument(new Uint8Array())).toEqual({ ok: false, problem: "empty" });
    const large = new Uint8Array(MAX_DELAY_DOCUMENT_BYTES + 1);
    large.set(PDF);
    expect(checkDelayDocument(large)).toEqual({ ok: false, problem: "tooLarge" });
    const limit = new Uint8Array(MAX_DELAY_DOCUMENT_BYTES);
    limit.set(PDF);
    expect(checkDelayDocument(limit)).toEqual({ ok: true });
  });
});

describe("the log of an airline's documents", () => {
  const at = (hour: number) => new Date(Date.UTC(2026, 8, 30, hour));
  const row = (id: string, uploaded: number, rest: Partial<DocumentLogRow> = {}): DocumentLogRow => ({
    id,
    fileName: `${id}.pdf`,
    uploadedAt: at(uploaded),
    uploadedBy: "Admin",
    removedAt: null,
    removedBy: null,
    replaced: false,
    ...rest,
  });

  it("tells an upload, a replacement and a removal apart, newest first", () => {
    const events = documentEvents([
      row("a", 8, { removedAt: at(9), removedBy: "Béla", replaced: true }),
      row("b", 9, { uploadedBy: "Béla", removedAt: at(11), removedBy: "Cili" }),
      row("c", 12),
    ]);
    expect(events.map((e) => [e.kind, e.fileName, e.by, e.at.getUTCHours()])).toEqual([
      ["UPLOADED", "c.pdf", "Admin", 12],
      ["REMOVED", "b.pdf", "Cili", 11],
      ["REPLACED", "b.pdf", "Béla", 9],
      ["UPLOADED", "a.pdf", "Admin", 8],
    ]);
  });

  it("is empty without documents", () => {
    expect(documentEvents([])).toEqual([]);
  });
});
