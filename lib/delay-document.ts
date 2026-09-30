import { detectUploadType, type UploadProblem } from "@/lib/training";

// The airline's own delay code document (CLAUDE.md, 8. mérföldkő, utómunka):
// one PDF per airline, known by its first bytes, not by its name.

/** A placeholder limit (CLAUDE.md): 10 MB. */
export const MAX_DELAY_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const DELAY_DOCUMENT_TYPE = "application/pdf";

export function checkDelayDocument(bytes: Uint8Array): { ok: true } | { ok: false; problem: UploadProblem } {
  if (bytes.byteLength === 0) return { ok: false, problem: "empty" };
  if (bytes.byteLength > MAX_DELAY_DOCUMENT_BYTES) return { ok: false, problem: "tooLarge" };
  return detectUploadType(bytes) === DELAY_DOCUMENT_TYPE ? { ok: true } : { ok: false, problem: "type" };
}

/** What happened to a document, for the log: every row is an upload, and a closed one also a replacement or a removal. */
export type DocumentEventKind = "UPLOADED" | "REPLACED" | "REMOVED";

export interface DocumentLogRow {
  id: string;
  fileName: string;
  uploadedAt: Date;
  uploadedBy: string;
  removedAt: Date | null;
  removedBy: string | null;
  replaced: boolean;
}

export interface DocumentEvent {
  key: string;
  kind: DocumentEventKind;
  fileName: string;
  at: Date;
  by: string;
}

/**
 * The log of an airline's documents, newest first: who uploaded, replaced or
 * removed which file, and when. A replacement is one event, told by the file
 * that took the old one's place.
 */
export function documentEvents(rows: readonly DocumentLogRow[]): DocumentEvent[] {
  const byUpload = [...rows].sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime());
  const events: DocumentEvent[] = [];
  byUpload.forEach((row, index) => {
    const previous = byUpload[index - 1];
    const replaces = !!previous?.replaced;
    events.push({
      key: `${row.id}:up`,
      kind: replaces ? "REPLACED" : "UPLOADED",
      fileName: row.fileName,
      at: row.uploadedAt,
      by: row.uploadedBy,
    });
    if (row.removedAt && !row.replaced) {
      events.push({ key: `${row.id}:rm`, kind: "REMOVED", fileName: row.fileName, at: row.removedAt, by: row.removedBy ?? "" });
    }
  });
  return events.sort((a, b) => b.at.getTime() - a.at.getTime());
}
