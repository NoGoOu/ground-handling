import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { IMAGE_MAX_SIDE, preparedName, prepareUpload } from "@/lib/data/uploads";

// Shrinking uploaded images (CLAUDE.md, 13. mérföldkő, utómunka, 1. pont).

const fileOf = (bytes: Uint8Array | Buffer, name: string) => new File([new Uint8Array(bytes)], name);

async function photo(width: number, height: number, options: { orientation?: number; gps?: boolean } = {}) {
  let image = sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 40 } } }).jpeg({ quality: 95 });
  if (options.orientation) image = image.withMetadata({ orientation: options.orientation });
  if (options.gps) {
    image = image.withExifMerge({
      IFD0: { Make: "Telefon", Model: "Próba" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "47/1 26/1 0/1", GPSLongitudeRef: "E", GPSLongitude: "19/1 15/1 0/1" },
    });
  }
  return image.toBuffer();
}

describe("an uploaded image", () => {
  it("becomes a JPEG of at most 1600 pixels, turned by its orientation, without metadata", async () => {
    // A 4000 × 3000 photo the camera marked "turn right": it stands upright, 1200 × 1600.
    const original = await photo(4000, 3000, { orientation: 6, gps: true });
    const before = await sharp(original).metadata();
    expect(before.exif).toBeDefined();
    expect(before.orientation).toBe(6);

    const prepared = await prepareUpload(fileOf(original, "IMG_0001.JPG"), "foto");
    if ("problem" in prepared) throw new Error(prepared.problem);
    const after = await sharp(prepared.bytes).metadata();
    expect(prepared.type).toBe("image/jpeg");
    expect(prepared.name).toBe("IMG_0001.jpg");
    expect([after.width, after.height]).toEqual([1200, IMAGE_MAX_SIDE]);
    expect(after.format).toBe("jpeg");
    expect(after.exif).toBeUndefined();
    expect(after.orientation).toBeUndefined();
    expect(prepared.bytes.byteLength).toBeLessThan(original.byteLength);
  });

  it("turns a PNG into a JPEG on white, and never enlarges a small one", async () => {
    const png = await sharp({ create: { width: 800, height: 600, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    const prepared = await prepareUpload(fileOf(png, "rajz.png"), "foto");
    if ("problem" in prepared) throw new Error(prepared.problem);
    expect(prepared.type).toBe("image/jpeg");
    expect(prepared.name).toBe("rajz.jpg");
    const { data, info } = await sharp(prepared.bytes).raw().toBuffer({ resolveWithObject: true });
    expect([info.width, info.height]).toEqual([800, 600]);
    // The transparent corner is white now.
    expect([...data.subarray(0, 3)].every((value) => value > 245)).toBe(true);
  });

  it("leaves a PDF as it is", async () => {
    const pdf = new TextEncoder().encode("%PDF-1.4\n% próba\n%%EOF\n");
    const prepared = await prepareUpload(fileOf(pdf, "szervizlap.pdf"), "dokumentum");
    expect(prepared).toEqual({ bytes: pdf, type: "application/pdf", name: "szervizlap.pdf" });
  });

  it("refuses an image it cannot read, and checks the size before shrinking", async () => {
    const broken = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(await prepareUpload(fileOf(broken, "hibas.jpg"), "foto")).toEqual({ problem: "type" });
    const huge = new Uint8Array(10 * 1024 * 1024 + 1);
    huge.set([0xff, 0xd8, 0xff]);
    expect(await prepareUpload(fileOf(huge, "nagy.jpg"), "foto")).toEqual({ problem: "tooLarge" });
    expect(await prepareUpload(fileOf(new TextEncoder().encode("hello"), "szoveg.txt"), "foto")).toEqual({ problem: "type" });
  });
});

describe("the name kept for the download", () => {
  it("ends in .jpg once the image is a JPEG, and falls back when there is none", () => {
    expect(preparedName("IMG_1234.PNG", "foto", "image/jpeg")).toBe("IMG_1234.jpg");
    expect(preparedName("kép.jpeg", "foto", "image/jpeg")).toBe("kép.jpg");
    expect(preparedName("", "foto", "image/jpeg")).toBe("foto.jpg");
    expect(preparedName("C:\\fakepath\\..\\forgalmi.pdf", "dokumentum", "application/pdf")).toBe("forgalmi.pdf");
  });
});
