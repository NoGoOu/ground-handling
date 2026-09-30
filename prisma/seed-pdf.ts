// A tiny one-page PDF of plain text lines, for the seed's placeholder
// documents. The text is ASCII only: the built-in Helvetica has no ő and ű.

const escapeText = (text: string) => text.replace(/[\\()]/g, (char) => `\\${char}`);

export function textPdf(lines: readonly string[], fontSize = 12): Uint8Array {
  const leading = Math.round(fontSize * 1.5);
  const stream = [
    "BT",
    `/F1 ${fontSize} Tf`,
    `${leading} TL`,
    "72 760 Td",
    ...lines.map((line) => `(${escapeText(line)}) Tj T*`),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((body, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}
