import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { AirlineInfo, ExistingFlight, ImportDiff } from "@/lib/import/diff";
import type { ImportMapping } from "@/lib/import/mapping";
import type { ImportedTurnaround } from "@/lib/import/pairing";
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
 * 3. mérföldkő): records, estimates, actuals, cancellations, agents, or any
 * entry in the flight's log (a cancellation that was restored, for instance).
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
      source: true,
      _count: { select: { events: true } },
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
    source: flight.source,
    operational:
      flight._count.events > 0 ||
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

const flightDate = (date: string) => new Date(`${date}T00:00:00Z`);

/** The schedule fields of a turnaround: the only fields an import writes (CLAUDE.md, 3. mérföldkő). */
function scheduleData(turnaround: ImportedTurnaround) {
  const { arrival, departure } = turnaround;
  return {
    inboundFlightNumber: arrival?.flightNumber ?? null,
    sta: arrival?.sta ?? null,
    origin: arrival?.origin ?? null,
    arrivalFlightDate: arrival ? flightDate(arrival.flightDate) : null,
    outboundFlightNumber: departure?.flightNumber ?? null,
    std: departure?.std ?? null,
    destination: departure?.destination ?? null,
    departureFlightDate: departure ? flightDate(departure.flightDate) : null,
    aircraftType: departure?.aircraftType ?? arrival?.aircraftType ?? null,
    aircraftConfig: departure?.aircraftConfig ?? arrival?.aircraftConfig ?? null,
  };
}

const NO_ARRIVAL = { inboundFlightNumber: null, sta: null, origin: null, arrivalFlightDate: null };
const NO_DEPARTURE = { outboundFlightNumber: null, std: null, destination: null, departureFlightDate: null };

export interface ImportSummary {
  new: number;
  changed: number;
  repaired: number;
  merged: number;
  unchanged: number;
  conflicts: number;
  errors: number;
  unpaired: number;
  missing: number;
  filteredRows: number;
  totalRows: number;
}

/**
 * Writes an import as the dry run decided it, in one transaction: re-paired
 * flights first give up the legs they lose, then every matched flight gets its
 * schedule fields, the new flights are created with their tasks, and the
 * missing markers are set. Estimates, actuals, delays, cancellations,
 * assignments, stands and templates are never touched.
 */
export async function applyImport({
  userId,
  diff,
  profileId,
  fileName,
  fileSize,
  period,
  summary,
}: {
  userId: string;
  diff: ImportDiff;
  profileId: string | null;
  fileName: string;
  fileSize: number;
  period: { start: string; end: string };
  summary: ImportSummary;
}): Promise<string> {
  const imported = { source: "IMPORT" as const, ...(profileId ? { importProfileId: profileId } : {}) };
  const found = { arrivalMissing: false, departureMissing: false, missingImportRunId: null };

  return prisma.$transaction(
    async (tx) => {
      const run = await tx.importRun.create({
        data: {
          profileId,
          fileName,
          fileSize,
          rangeStart: flightDate(period.start),
          rangeEnd: flightDate(period.end),
          summary: summary as unknown as Prisma.InputJsonValue,
          createdById: userId,
        },
        select: { id: true },
      });

      // 0. A merge deletes the one-sided flight that gives its leg away (its task goes with it).
      const mergedAway = diff.entries.flatMap((e) => (e.kind === "changed" && e.merges ? [e.merges] : []));
      if (mergedAway.length > 0) await tx.flight.deleteMany({ where: { id: { in: mergedAway } } });

      // 1. A re-paired flight gives up the leg it loses, so another flight may take it.
      for (const entry of diff.entries) {
        if (entry.kind !== "changed" || !entry.repair) continue;
        await tx.flight.update({
          where: { id: entry.flightId },
          data: entry.kept === "ARRIVAL_PART" ? NO_DEPARTURE : NO_ARRIVAL,
        });
      }

      // 2. Matched flights: the schedule fields, the profile, and "found again".
      for (const entry of diff.entries) {
        if (entry.kind !== "changed") continue;
        await tx.flight.update({
          where: { id: entry.flightId },
          data: { ...scheduleData(entry.turnaround), ...imported, ...found },
        });
      }
      const unchanged = diff.entries.flatMap((e) => (e.kind === "unchanged" ? [e.flightId] : []));
      if (unchanged.length > 0) {
        await tx.flight.updateMany({ where: { id: { in: unchanged } }, data: { ...imported, ...found } });
      }

      // 3. New flights, each with its task (one task per flight, CLAUDE.md).
      const created = diff.entries.flatMap((e) =>
        e.kind === "new"
          ? [{ airlineId: e.airlineId, templateId: e.templateId, ...scheduleData(e.turnaround), ...imported }]
          : [],
      );
      if (created.length > 0) {
        const flights = await tx.flight.createManyAndReturn({ data: created, select: { id: true } });
        await tx.task.createMany({ data: flights.map((flight) => ({ flightId: flight.id })) });
      }

      // 4. "Az utolsó importból hiányzik": marked, never deleted or cancelled.
      for (const part of ["ARRIVAL_PART", "DEPARTURE_PART"] as const) {
        const ids = diff.missing.filter((m) => m.parts.includes(part)).map((m) => m.flightId);
        if (ids.length > 0) {
          await tx.flight.updateMany({
            where: { id: { in: ids } },
            data: {
              ...(part === "ARRIVAL_PART" ? { arrivalMissing: true } : { departureMissing: true }),
              missingImportRunId: run.id,
            },
          });
        }
      }
      if (diff.present.length > 0) {
        await tx.flight.updateMany({ where: { id: { in: diff.present } }, data: found });
      }
      return run.id;
    },
    // A full season is thousands of flights.
    { timeout: 120_000, maxWait: 10_000 },
  );
}

/** The import log, newest first. */
export async function listImportRuns(limit = 10) {
  const runs = await prisma.importRun.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      createdAt: true,
      fileName: true,
      rangeStart: true,
      rangeEnd: true,
      summary: true,
      createdBy: { select: { name: true } },
      profile: { select: { name: true } },
    },
  });
  return runs.map((run) => ({ ...run, summary: run.summary as unknown as ImportSummary }));
}

export async function findImportRun(id: string) {
  const run = await prisma.importRun.findUnique({ where: { id }, select: { id: true, summary: true } });
  return run && { id: run.id, summary: run.summary as unknown as ImportSummary };
}

/** Flights marked "az utolsó importból hiányzik", for the planner to decide on. */
export async function listMissingFlights() {
  return prisma.flight.findMany({
    where: { OR: [{ arrivalMissing: true }, { departureMissing: true }] },
    orderBy: [{ sta: "asc" }, { std: "asc" }],
    select: {
      id: true,
      inboundFlightNumber: true,
      outboundFlightNumber: true,
      sta: true,
      std: true,
      origin: true,
      destination: true,
      arrivalMissing: true,
      departureMissing: true,
      missingImportRun: { select: { createdAt: true, fileName: true } },
    },
  });
}
