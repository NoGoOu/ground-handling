import sharp from "sharp";
import { checkUpload, type UploadProblem, type UploadType } from "@/lib/training";

// Every uploaded file goes through here (CLAUDE.md, 13. mérföldkő, utómunka,
// "Képek kicsinyítése"): first the check of the type and the size (10 MB,
// before any shrinking), then a JPG or PNG becomes a JPEG of at most 1600
// pixels on its longer side, turned by its orientation, without its metadata
// (e.g. the GPS place). The original is not kept. A PDF stays as it is.

/** Placeholders. */
export const IMAGE_MAX_SIDE = 1600;
export const JPEG_QUALITY = 80;

export interface PreparedUpload {
  bytes: Uint8Array;
  type: UploadType;
  /** The name to show, with ".jpg" for a converted image. */
  name: string;
}

/** The user's file name, kept for the download; ".jpg" once the image is a JPEG. */
export function preparedName(name: string, fallback: string, type: UploadType): string {
  // Only the last part of a path, by either separator, whatever system the server runs on.
  const base = (name.split(/[\\/]/).pop() ?? "").slice(0, 200) || fallback;
  if (type !== "image/jpeg") return base;
  const stem = base.replace(/\.(jpe?g|png)$/i, "");
  return `${stem.slice(0, 196)}.jpg`;
}

/** An image as a small JPEG without metadata; null when it cannot be read. */
export async function shrinkImage(bytes: Uint8Array): Promise<Uint8Array | null> {
  try {
    const output = await sharp(bytes, { failOn: "error" })
      // Turned by the orientation the camera wrote; the orientation tag goes with the rest.
      .rotate()
      .resize({ width: IMAGE_MAX_SIDE, height: IMAGE_MAX_SIDE, fit: "inside", withoutEnlargement: true })
      // A transparent PNG gets a white background in the JPEG.
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
    return new Uint8Array(output);
  } catch {
    return null;
  }
}

/** Checks a file and prepares it for the storage: the bytes, the type and the name to keep. */
export async function prepareUpload(file: File, fallbackName: string): Promise<PreparedUpload | { problem: UploadProblem }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const checked = checkUpload(bytes);
  if ("problem" in checked) return checked;
  if (checked.type === "application/pdf") return { bytes, type: checked.type, name: preparedName(file.name, fallbackName, checked.type) };
  const shrunk = await shrinkImage(bytes);
  if (!shrunk) return { problem: "type" };
  return { bytes: shrunk, type: "image/jpeg", name: preparedName(file.name, fallbackName, "image/jpeg") };
}
