import Link from "next/link";
import { notFound } from "next/navigation";
import { findUpload } from "@/lib/data/imports";
import { readFile, ReadError, tableFrom, type Cell, type ParsedFile } from "@/lib/import/read";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canImportSchedule } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";

const t = messages.import;
const RAW_ROWS = 8;
const PREVIEW_ROWS = 20;

function cellText(cell: Cell): string {
  return cell === null ? "" : String(cell);
}

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} kB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ImportUploadPage(props: PageProps<"/import/[uploadId]">) {
  const user = await requireCapability(canImportSchedule);
  const { uploadId } = await props.params;
  const search = await props.searchParams;
  const upload = await findUpload(uploadId, user.id);
  if (!upload) notFound();

  let parsed: ParsedFile;
  try {
    parsed = readFile(upload.fileName, upload.content);
  } catch (error) {
    if (!(error instanceof ReadError)) throw error;
    return <p className="text-red-700">{fmt(t.errors.unreadable, { reason: error.message })}</p>;
  }

  // Sheet and header row come from the query string, so every choice is a plain GET.
  const sheet = parsed.sheets.find((s) => s.name === first(search.sheet)) ?? parsed.sheets[0];
  const requestedHeader = Number.parseInt(first(search.header) ?? "1", 10);
  const headerRow = Number.isInteger(requestedHeader)
    ? Math.min(Math.max(requestedHeader, 1), Math.max(sheet.rows.length, 1))
    : 1;
  const table = tableFrom(sheet.rows, headerRow - 1);
  const shown = table.rows.slice(0, PREVIEW_ROWS);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/import" className="self-start text-sm text-sky-700 hover:underline">
        {t.back}
      </Link>
      <div>
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="text-sm text-neutral-600">
          {fmt(t.fileInfo, { name: upload.fileName, size: formatSize(upload.size), format: parsed.format.toUpperCase() })}
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-neutral-700">{t.sheet}</span>
          <select name="sheet" defaultValue={sheet.name} className="input w-auto py-1.5">
            {parsed.sheets.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-neutral-700">
            {t.headerRow} <span className="font-normal text-neutral-500">({t.headerRowHint})</span>
          </span>
          <input
            type="number"
            name="header"
            min={1}
            max={Math.max(sheet.rows.length, 1)}
            defaultValue={headerRow}
            className="input w-24 py-1.5"
          />
        </label>
        <button type="submit" className="btn btn-secondary">
          {t.show}
        </button>
      </form>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{t.rawRows}</h2>
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-neutral-100">
              {sheet.rows.slice(0, RAW_ROWS).map((row, index) => (
                <tr key={index} className={index === headerRow - 1 ? "bg-sky-50 font-semibold" : ""}>
                  <td className="px-2 py-1 text-neutral-400 tabular-nums">{index + 1}</td>
                  {row.map((cell, column) => (
                    <td key={column} className="px-2 py-1 whitespace-nowrap">
                      {cellText(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">{t.preview}</h2>
          <span className="text-sm text-neutral-600">
            {fmt(t.previewCount, { count: table.rows.length, shown: shown.length })}
          </span>
        </div>
        {table.headers.length === 0 ? (
          <p className="text-sm text-red-700">{t.errors.noHeader}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                <tr>
                  {table.headers.map((header, column) => (
                    <th key={column} className="px-2 py-1.5 whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {shown.map((row, index) => (
                  <tr key={index}>
                    {row.map((cell, column) => (
                      <td key={column} className="px-2 py-1 whitespace-pre tabular-nums">
                        {cellText(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
