/**
 * A stored PDF opened in the browser (the airlines' delay code documents).
 * Its type was checked by its first bytes on upload, and nosniff keeps the
 * browser from reading it as anything else.
 */
export function pdfResponse(file: { fileName: string; content: Uint8Array }): Response {
  return new Response(new Uint8Array(file.content), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
