import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { AirlineInfo, ExistingFlight } from "@/lib/import/diff";
import type { ImportMapping } from "@/lib/import/mapping";
import type { StoredProfile } from "@/lib/import/profiles";
import { readFile, tableFrom } from "@/lib/import/read";
import { mappingSchema } from "@/lib/validation/import";

// Uploaded schedule files live in the database between the steps of the
// import (sheet, header, mapping, dry run, save), for a day at most.

const UPLOAD_LIFETIME_MS = 24 * 60 * 60 * 1000;

/** An upload is only visible to the user who uploaded it. */
export async function findUpload(id: string, userId: string) {
  return prisma.importUpload.findFirst({ where: { id, createdById: userId } });
}

export async function saveUpload(userId: string, fileName: string, content: Uint8Array<ArrayBuffer>) {
  // Housekeeping: nobody finishes an import a day later.
  await prisma.importUpload.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - UPLOAD_LIFETIME_MS) } } });
  return prisma.importUpload.create({
    data: { fileName, size: content.byteLength, content, createdById: userId },
    select: { id: true },
  });
}

/** Saved profiles with a valid mapping, by name. */
export async function listProfiles(): Promise<StoredProfile[]> {
  const rows = await prisma.importProfile.findMany({
    select: { id: true, name: true, headerFingerprint: true, mapping: true },
    orderBy: { name: "asc" },
  });
  return rows.flatMap((row) => {
    const mapping = mappingSchema.safeParse(row.mapping);
    return mapping.success ? [{ ...row, mapping: mapping.data }] : [];
  });
}

/** Saves under the name: a new profile, or the one with that name updated. */
export async function saveProfile(userId: string, name: string, mapping: ImportMapping, fingerprint: string) {
  const data = { headerFingerprint: fingerprint, mapping: mapping as unknown as Prisma.InputJsonValue };
  return prisma.importProfile.upsert({
    where: { name },
    create: { name, ...data, createdById: userId },
    update: data,
    select: { id: true },
  });
}

/** The table an import works on: the user's upload, its sheet, below its header row. */
export async function loadUploadTable(uploadId: string, userId: string, sheetName: string, headerRow: number) {
  const upload = await findUpload(uploadId, userId);
  if (!upload) return null;
  const parsed = readFile(upload.fileName, upload.content);
  const sheet = parsed.sheets.find((s) => s.name === sheetName);
  if (!sheet) return null;
  return { upload, table: tableFrom(sheet.rows, headerRow - 1) };
}

const dateText = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);

/**
 * The flights an import may touch: those with an STA or STD in the window.
 * "Operational" is what keeps a flight's pairing fixed (approved rule of the
 * 3. mérföldkő): records, estimates, actuals, cancellations or agents.
 */
export async function loadExistingFlights(window: { start: Date; end: Date }): Promise<ExistingFlight[]> {
  const within = { gte: window.start, lt: window.end };
  const flights = await prisma.flight.findMany({
    where: { OR: [{ sta: within }, { std: within }] },
    select: {
      id: true,
      airline: { select: { iataCode: true } },
      inboundFlightNumber: true,
      outboundFlightNumber: true,
      arrivalFlightDate: true,
      departureFlightDate: true,
      origin: true,
      destination: true,
      sta: true,
      std: true,
      eta: true,
      etd: true,
      ata: true,
      atd: true,
      arrivalCancelled: true,
      departureCancelled: true,
      aircraftType: true,
      aircraftConfig: true,
      importProfileId: true,
      task: { select: { arrivalAgentId: true, departureAgentId: true, _count: { select: { records: true } } } },
    },
  });
  return flights.map((flight) => ({
    id: flight.id,
    airline: flight.airline.iataCode,
    inboundFlightNumber: flight.inboundFlightNumber,
    outboundFlightNumber: flight.outboundFlightNumber,
    arrivalFlightDate: dateText(flight.arrivalFlightDate),
    departureFlightDate: dateText(flight.departureFlightDate),
    origin: flight.origin,
    destination: flight.destination,
    sta: flight.sta,
    std: flight.std,
    aircraftType: flight.aircraftType,
    aircraftConfig: flight.aircraftConfig,
    importProfileId: flight.importProfileId,
    operational:
      !!(flight.eta || flight.etd || flight.ata || flight.atd) ||
      flight.arrivalCancelled ||
      flight.departureCancelled ||
      !!flight.task?.arrivalAgentId ||
      !!flight.task?.departureAgentId ||
      (flight.task?._count.records ?? 0) > 0,
  }));
}

export async function loadAirlines(): Promise<AirlineInfo[]> {
  const airlines = await prisma.airline.findMany({ select: { id: true, iataCode: true, defaultTemplateId: true } });
  return airlines.map((a) => ({ id: a.id, code: a.iataCode, defaultTemplateId: a.defaultTemplateId }));
}
