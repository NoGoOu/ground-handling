import path from "node:path";
import * as storage from "@/lib/data/storage";
import { prisma } from "@/lib/db";
import { checkDelayDocument, DELAY_DOCUMENT_TYPE, documentEvents, type DocumentEvent } from "@/lib/delay-document";
import type { UploadProblem } from "@/lib/training";

// The airlines' own delay code documents (CLAUDE.md, 8. mérföldkő, utómunka):
// one PDF per airline in our storage. A new upload takes the place of the old
// one, whose file is deleted; the rows stay as the log of who did what and when.

const FOLDER = "delay-codes";

const current = { storageKey: { not: null } } as const;

export interface DelayDocumentInfo {
  fileName: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string;
}

/** The airline's document, when it has one. */
export async function currentDelayDocument(airlineId: string): Promise<DelayDocumentInfo | null> {
  const document = await prisma.delayCodeDocument.findFirst({
    where: { airlineId, ...current },
    orderBy: { uploadedAt: "desc" },
    select: { fileName: true, size: true, uploadedAt: true, uploadedBy: { select: { name: true } } },
  });
  return document && { ...document, uploadedBy: document.uploadedBy.name };
}

export type SaveDocumentResult = { ok: true; replaced: boolean } | { ok: false; problem: UploadProblem | "airline" };

/** Stores the airline's document; an earlier one is replaced and its file deleted. */
export async function saveDelayDocument(airlineId: string, file: File, userId: string): Promise<SaveDocumentResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const checked = checkDelayDocument(bytes);
  if (!checked.ok) return checked;

  const storageKey = await storage.storeFile(FOLDER, bytes, DELAY_DOCUMENT_TYPE);
  let replacedKeys: string[] | null;
  try {
    replacedKeys = await prisma.$transaction(async (tx) => {
      // The airline's row is locked, so that two uploads at once cannot leave two documents.
      const airline = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Airline" WHERE "id" = ${airlineId} FOR UPDATE`;
      if (airline.length === 0) return null;
      const earlier = await tx.delayCodeDocument.findMany({ where: { airlineId, ...current }, select: { id: true, storageKey: true } });
      const now = new Date();
      await tx.delayCodeDocument.updateMany({
        where: { id: { in: earlier.map((document) => document.id) } },
        data: { storageKey: null, removedById: userId, removedAt: now, replaced: true },
      });
      await tx.delayCodeDocument.create({
        data: {
          airlineId,
          // The name the user gave, for the log and the download; the stored name is ours.
          fileName: path.basename(file.name || "keseskodok.pdf").slice(0, 200),
          size: bytes.byteLength,
          storageKey,
          uploadedById: userId,
          uploadedAt: now,
        },
      });
      return earlier.map((document) => document.storageKey!);
    });
  } catch (error) {
    await storage.deleteStoredFile(FOLDER, storageKey);
    throw error;
  }
  if (!replacedKeys) {
    await storage.deleteStoredFile(FOLDER, storageKey);
    return { ok: false, problem: "airline" };
  }
  for (const key of replacedKeys) await storage.deleteStoredFile(FOLDER, key);
  return { ok: true, replaced: replacedKeys.length > 0 };
}

/** Removes the airline's document: the file is deleted, the row stays as the log. */
export async function removeDelayDocument(airlineId: string, userId: string): Promise<boolean> {
  const documents = await prisma.delayCodeDocument.findMany({ where: { airlineId, ...current }, select: { id: true, storageKey: true } });
  if (documents.length === 0) return false;
  await prisma.delayCodeDocument.updateMany({
    where: { id: { in: documents.map((document) => document.id) }, ...current },
    data: { storageKey: null, removedById: userId, removedAt: new Date() },
  });
  for (const document of documents) await storage.deleteStoredFile(FOLDER, document.storageKey!);
  return true;
}

/** The bytes of the airline's document, for the download. */
export async function readDelayDocument(airlineId: string): Promise<{ fileName: string; content: Buffer } | null> {
  const document = await prisma.delayCodeDocument.findFirst({
    where: { airlineId, ...current },
    orderBy: { uploadedAt: "desc" },
    select: { fileName: true, storageKey: true },
  });
  if (!document?.storageKey) return null;
  const content = await storage.readStoredFile(FOLDER, document.storageKey);
  return content && { fileName: document.fileName, content };
}

export interface AirlineDelayDocuments {
  airline: { id: string; name: string; iataCode: string };
  document: DelayDocumentInfo | null;
  log: DocumentEvent[];
}

/** Every airline with its document and the log of its documents, for the settings page. */
export async function listAirlineDelayDocuments(): Promise<AirlineDelayDocuments[]> {
  const airlines = await prisma.airline.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      iataCode: true,
      delayCodeDocuments: {
        orderBy: { uploadedAt: "asc" },
        select: {
          id: true,
          fileName: true,
          size: true,
          storageKey: true,
          uploadedAt: true,
          uploadedBy: { select: { name: true } },
          removedAt: true,
          removedBy: { select: { name: true } },
          replaced: true,
        },
      },
    },
  });
  return airlines.map(({ delayCodeDocuments, ...airline }) => {
    const live = delayCodeDocuments.findLast((document) => document.storageKey !== null);
    return {
      airline,
      document: live
        ? { fileName: live.fileName, size: live.size, uploadedAt: live.uploadedAt, uploadedBy: live.uploadedBy.name }
        : null,
      log: documentEvents(
        delayCodeDocuments.map((document) => ({
          id: document.id,
          fileName: document.fileName,
          uploadedAt: document.uploadedAt,
          uploadedBy: document.uploadedBy.name,
          removedAt: document.removedAt,
          removedBy: document.removedBy?.name ?? null,
          replaced: document.replaced,
        })),
      ),
    };
  });
}

/**
 * What "Késéskódok" opens from a flight: the airline's own document, or
 * without one the common table of the active codes.
 */
export interface DelayCodeReference {
  document: { fileName: string } | null;
  codes: { code: string; description: string | null }[];
}

export async function delayCodeReference(airlineId: string): Promise<DelayCodeReference> {
  const document = await currentDelayDocument(airlineId);
  if (document) return { document: { fileName: document.fileName }, codes: [] };
  const codes = await prisma.delayCode.findMany({
    where: { active: true },
    orderBy: { code: "asc" },
    select: { code: true, description: true },
  });
  return { document: null, codes };
}
