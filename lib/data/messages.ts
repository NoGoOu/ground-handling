import { createHash } from "node:crypto";
import { Prisma, type MessageSource } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { messageEffects, versionKey, versionKind, type EffectFlight, type ResolvedTimes } from "@/lib/telex/effects";
import { bodyLines, parseHeader, type Header } from "@/lib/telex/header";
import { matchMessage, splitFlightNumber, type MatchFlight, type Part, type UnmatchedReason } from "@/lib/telex/match";
import { parseMessage, type MessageData, type ParsedMessage } from "@/lib/telex/parse";
import { isSupported, normaliseForHash, splitMessages, type MessageType, type RawMessage, type SupportedType } from "@/lib/telex/split";
import { warn, type TelexWarning } from "@/lib/telex/warnings";

// Receiving messages (CLAUDE.md, 7. mérföldkő): every message goes through
// processText, whether it came through the API or was pasted by hand. It is
// stored with its raw text, matched to a flight part, versioned, and a new
// version acts on the flight; each change goes into the flight's log.

export interface ReceiveOptions {
  source: Extract<MessageSource, "MANUAL" | "API">;
  receivedAt: Date;
  /** Who pasted it; null for the API. */
  userId: string | null;
  apiKeyId: string | null;
  /** The "source" field of an API request. */
  sourceNote: string | null;
}

export type ProcessedMessage =
  | {
      status: "stored";
      type: SupportedType;
      messageId: string;
      flightNumber: string | null;
      matched: { flightId: string; flightNumber: string; operatingDay: string; part: Part } | null;
      unmatchedReason: UnmatchedReason | null;
      /** False when a version received later already counts. */
      current: boolean;
      warnings: TelexWarning[];
    }
  | { status: "duplicate"; type: SupportedType; messageId: string }
  | { status: "unsupported"; type: MessageType; flightNumber: string | null; headerDate: string | null };

/** What the Message.parsed column holds. */
export interface StoredParsed {
  header: Header | null;
  data: MessageData["data"];
  /** The message's times as instants (ISO), once matched. */
  times?: Partial<Record<keyof ResolvedTimes, string>>;
}

export const textHash = (text: string) => createHash("sha256").update(normaliseForHash(text)).digest("hex");

const json = (value: unknown) => value as Prisma.InputJsonValue;
const dayText = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);

/** The ParsedMessage again from a stored row. */
export function parsedOf(row: { type: string; parsed: Prisma.JsonValue }): ParsedMessage {
  const stored = row.parsed as unknown as StoredParsed;
  return { type: row.type, header: stored.header, data: stored.data, warnings: [] } as ParsedMessage;
}

export const FLIGHT_SELECT = {
  id: true,
  airlineId: true,
  inboundFlightNumber: true,
  outboundFlightNumber: true,
  arrivalFlightDate: true,
  departureFlightDate: true,
  origin: true,
  destination: true,
  arrivalRegistration: true,
  departureRegistration: true,
  sta: true,
  std: true,
  ata: true,
  atd: true,
  eta: true,
  arrivalCancelled: true,
  departureCancelled: true,
} as const;

export type FlightRow = Prisma.FlightGetPayload<{ select: typeof FLIGHT_SELECT }>;

const matchFlight = (f: FlightRow): MatchFlight => ({
  ...f,
  arrivalFlightDate: dayText(f.arrivalFlightDate),
  departureFlightDate: dayText(f.departureFlightDate),
});

export const effectFlight = (f: FlightRow): EffectFlight => ({
  sta: f.sta,
  std: f.std,
  arrivalFlightDate: dayText(f.arrivalFlightDate),
  departureFlightDate: dayText(f.departureFlightDate),
  arrivalCancelled: f.arrivalCancelled,
  departureCancelled: f.departureCancelled,
});

const same = (a: Date | null, b: Date | undefined) => !!b && a?.getTime() === b.getTime();

/**
 * Hangs a stored message on a flight part: the version it replaces, and when
 * it is the newest of its kind, what it does to the flight. Returns whether it
 * counts and the warnings of the effects.
 */
async function applyToFlight(
  tx: Prisma.TransactionClient,
  messageId: string,
  parsed: ParsedMessage,
  flight: FlightRow,
  part: Part,
  receivedAt: Date,
  userId: string | null,
  fillRegistration: string | null,
  /** The warnings the message already has. */
  earlier: TelexWarning[],
): Promise<{ current: boolean; warnings: TelexWarning[] }> {
  const key = versionKey(flight.id, part, parsed.type, versionKind(parsed));
  const previous = await tx.message.findFirst({ where: { versionKey: key, current: true, id: { not: messageId } } });
  // The newest by receipt counts; an older one that comes in late is kept only.
  const current = !previous || previous.receivedAt.getTime() <= receivedAt.getTime();
  const effects = messageEffects(parsed, part, effectFlight(flight));
  const warnings = current ? effects.warnings : [...effects.warnings, warn("olderVersion")];
  const times = Object.fromEntries(Object.entries(effects.times).map(([name, time]) => [name, time.toISOString()]));

  if (current && previous) await tx.message.update({ where: { id: previous.id }, data: { current: false } });
  await tx.message.update({
    where: { id: messageId },
    data: {
      flightId: flight.id,
      part,
      unmatchedReason: null,
      kind: versionKind(parsed),
      versionKey: key,
      current,
      supersedesId: current ? (previous?.id ?? null) : null,
      parsed: json({ header: parsed.header, data: parsed.data, times }),
      warnings: json([...earlier, ...warnings]),
    },
  });
  if (!current) return { current, warnings };

  const event = { flightId: flight.id, messageId, createdById: userId, part };
  if (fillRegistration) {
    await tx.flight.update({
      where: { id: flight.id },
      data: part === "ARRIVAL_PART" ? { arrivalRegistration: fillRegistration } : { departureRegistration: fillRegistration },
    });
    await tx.flightEvent.create({ data: { ...event, kind: "REGISTRATION", registration: fillRegistration } });
  }
  if (effects.atd && !same(flight.atd, effects.atd)) {
    await tx.flight.update({ where: { id: flight.id }, data: { atd: effects.atd } });
    await tx.flightEvent.create({ data: { ...event, kind: "ACTUAL", atd: effects.atd } });
  }
  if (effects.ata && !same(flight.ata, effects.ata)) {
    await tx.flight.update({ where: { id: flight.id }, data: { ata: effects.ata } });
    await tx.flightEvent.create({ data: { ...event, kind: "ACTUAL", ata: effects.ata } });
  }
  if (effects.eta && !same(flight.eta, effects.eta)) {
    // The effective ETA is always the latest, by hand or from a message ("Késés és törlés").
    const note = `${parsed.type} ${parsed.header?.flightNumber ?? ""}/${parsed.header?.dateText ?? ""}`.trim();
    await tx.flight.update({
      where: { id: flight.id },
      data: { eta: effects.eta, etaSource: "MESSAGE", etaNote: note, etaRecordedById: userId, etaRecordedAt: new Date() },
    });
    await tx.flightEvent.create({
      data: { ...event, part: null, kind: "DELAY", eta: effects.eta, source: "MESSAGE", note },
    });
  }
  if (effects.delays) {
    // The delay codes of the newest departure MVT replace those of the earlier ones; codes by hand stay.
    const removed = await tx.delayRecord.deleteMany({ where: { flightId: flight.id, source: "MESSAGE" } });
    if (effects.delays.length > 0) {
      await tx.delayRecord.createMany({
        data: effects.delays.map((d) => ({ flightId: flight.id, code: d.code, minutes: d.minutes, source: "MESSAGE" as const, messageId })),
      });
    }
    if (effects.delays.length > 0 || removed.count > 0) {
      const note = effects.delays.map((d) => `${d.code}: ${d.minutes}`).join(", ") || "–";
      await tx.flightEvent.create({ data: { ...event, kind: "DELAY_CODES", note } });
    }
  }
  return { current, warnings };
}

/** The candidate flights of a message: its airline and flight number, on either part. */
async function candidates(parsed: ParsedMessage, airlines: { id: string; code: string }[]) {
  const split = parsed.header ? splitFlightNumber(parsed.header.flightNumber, airlines) : null;
  if (!split) return [];
  return prisma.flight.findMany({
    where: {
      airlineId: split.airline.id,
      OR: [{ inboundFlightNumber: split.flightNumber }, { outboundFlightNumber: split.flightNumber }],
    },
    select: FLIGHT_SELECT,
  });
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function receiveOne(
  raw: RawMessage & { type: SupportedType },
  envelope: string | null,
  options: ReceiveOptions,
  airlines: { id: string; code: string }[],
): Promise<ProcessedMessage> {
  const hash = textHash(raw.text);
  const duplicate = await prisma.message.findUnique({ where: { textHash: hash }, select: { id: true } });
  if (duplicate) return { status: "duplicate", type: raw.type, messageId: duplicate.id };

  const parsed = parseMessage(raw);
  const flights = await candidates(parsed, airlines);
  const match = matchMessage(parsed, options.receivedAt, airlines, flights.map(matchFlight));
  const header = parsed.header;
  const station =
    parsed.type === "MVT" || parsed.type === "UCM"
      ? parsed.data.station
      : parsed.type === "CPM"
        ? [parsed.data.from, parsed.data.to].filter(Boolean).join("") || null
        : null;

  try {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          direction: "INBOUND",
          type: raw.type,
          rawText: raw.text,
          envelope,
          textHash: hash,
          source: options.source,
          apiKeyId: options.apiKeyId,
          sourceNote: options.sourceNote,
          receivedAt: options.receivedAt,
          flightNumber: header?.flightNumber ?? null,
          headerDate: header?.dateText ?? null,
          registration: header?.registration ?? null,
          station,
          flightDate: match.key ? new Date(`${match.key.operatingDay}T00:00:00Z`) : null,
          parsed: json({ header, data: parsed.data }),
          warnings: json([...parsed.warnings, ...match.warnings]),
          unmatchedReason: match.matched ? null : match.reason,
          createdById: options.userId,
        },
        select: { id: true },
      });
      if (!match.matched) {
        return {
          status: "stored" as const,
          type: raw.type,
          messageId: created.id,
          flightNumber: header?.flightNumber ?? null,
          matched: null,
          unmatchedReason: match.reason,
          current: false,
          warnings: [...parsed.warnings, ...match.warnings],
        };
      }
      const flight = flights.find((f) => f.id === match.flightId)!;
      const applied = await applyToFlight(
        tx,
        created.id,
        parsed,
        flight,
        match.key.part,
        options.receivedAt,
        options.userId,
        match.fillRegistration,
        [...parsed.warnings, ...match.warnings],
      );
      return {
        status: "stored" as const,
        type: raw.type,
        messageId: created.id,
        flightNumber: header?.flightNumber ?? null,
        matched: {
          flightId: flight.id,
          flightNumber: match.key.flightNumber,
          operatingDay: match.key.operatingDay,
          part: match.key.part,
        },
        unmatchedReason: null,
        current: applied.current,
        warnings: [...parsed.warnings, ...match.warnings, ...applied.warnings],
      };
    });
  } catch (error) {
    // The same text sent twice at once: the other request stored it.
    if (!isUniqueViolation(error)) throw error;
    const stored = await prisma.message.findUnique({ where: { textHash: hash }, select: { id: true } });
    if (!stored) throw error;
    return { status: "duplicate", type: raw.type, messageId: stored.id };
  }
}

/**
 * A recognised but unsupported message (PTM, PSM): only its type, flight and
 * date go into the log, never the content.
 */
async function logUnsupported(raw: RawMessage, options: ReceiveOptions): Promise<ProcessedMessage> {
  const header = parseHeader(bodyLines(raw.lines)[0] ?? "");
  await prisma.unsupportedMessageLog.create({
    data: {
      type: raw.type,
      flightNumber: header?.flightNumber ?? null,
      headerDate: header?.dateText ?? null,
      receivedAt: options.receivedAt,
      source: options.source,
    },
  });
  return { status: "unsupported", type: raw.type, flightNumber: header?.flightNumber ?? null, headerDate: header?.dateText ?? null };
}

/** Splits, stores, matches and applies every message of a received text, in order. */
export async function processText(text: string, options: ReceiveOptions): Promise<ProcessedMessage[]> {
  const { envelope, messages } = splitMessages(text);
  const airlines = (await prisma.airline.findMany({ select: { id: true, iataCode: true } })).map((a) => ({
    id: a.id,
    code: a.iataCode,
  }));
  const results: ProcessedMessage[] = [];
  for (const raw of messages) {
    results.push(
      isSupported(raw.type)
        ? await receiveOne(raw as RawMessage & { type: SupportedType }, envelope, options, airlines)
        : await logUnsupported(raw, options),
    );
  }
  return results;
}

/**
 * Hangs an unmatched message on a flight part by hand ("Párosítatlan
 * üzenetek"); it then acts like a matched one.
 */
export async function assignMessage(messageId: string, flightId: string, part: Part, userId: string): Promise<TelexWarning[] | null> {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  const flight = await prisma.flight.findUnique({ where: { id: flightId }, select: FLIGHT_SELECT });
  if (!message || !flight || message.flightId || message.discardedAt || message.direction !== "INBOUND") return null;
  const hasPart = part === "ARRIVAL_PART" ? !!flight.sta : !!flight.std;
  if (!hasPart) return null;
  const parsed = parsedOf(message);
  const registration = parsed.header?.registration ?? null;
  const current = part === "ARRIVAL_PART" ? flight.arrivalRegistration : flight.departureRegistration;
  const extra = registration && current && registration !== current ? [warn("registrationMismatch", { flight: current, message: registration })] : [];
  return prisma.$transaction(async (tx) => {
    const applied = await applyToFlight(
      tx,
      messageId,
      parsed,
      flight,
      part,
      message.receivedAt,
      userId,
      registration && !current ? registration : null,
      [...(message.warnings as unknown as TelexWarning[]), ...extra],
    );
    return [...extra, ...applied.warnings];
  });
}

/** Sets an unmatched message aside; its raw text stays. */
export async function discardMessage(messageId: string, userId: string): Promise<boolean> {
  const updated = await prisma.message.updateMany({
    where: { id: messageId, flightId: null, discardedAt: null, direction: "INBOUND" },
    data: { discardedAt: new Date(), discardedById: userId },
  });
  return updated.count > 0;
}

export async function countUnmatched(): Promise<number> {
  return prisma.message.count({ where: { direction: "INBOUND", flightId: null, discardedAt: null } });
}

export interface CandidatePart {
  flightId: string;
  part: Part;
  flightNumber: string;
  /** "YYYY-MM-DD" */
  operatingDay: string;
  scheduled: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The flight parts an unmatched message may be hung on by hand: its flight
 * number within three days of its operating day (or of its receipt).
 */
async function candidateParts(
  message: { flightNumber: string | null; flightDate: Date | null; receivedAt: Date },
  airlines: { id: string; code: string }[],
): Promise<CandidatePart[]> {
  const split = message.flightNumber ? splitFlightNumber(message.flightNumber, airlines) : null;
  if (!split) return [];
  const around = message.flightDate ?? new Date(`${message.receivedAt.toISOString().slice(0, 10)}T00:00:00Z`);
  const range = { gte: new Date(around.getTime() - 3 * DAY_MS), lte: new Date(around.getTime() + 3 * DAY_MS) };
  const flights = await prisma.flight.findMany({
    where: {
      airlineId: split.airline.id,
      OR: [
        { inboundFlightNumber: split.flightNumber, arrivalFlightDate: range },
        { outboundFlightNumber: split.flightNumber, departureFlightDate: range },
      ],
    },
    select: FLIGHT_SELECT,
  });
  return flights
    .flatMap((f): CandidatePart[] => [
      ...(f.inboundFlightNumber === split.flightNumber && f.sta && f.arrivalFlightDate
        ? [{ flightId: f.id, part: "ARRIVAL_PART" as const, flightNumber: split.flightNumber, operatingDay: dayText(f.arrivalFlightDate)!, scheduled: f.sta }]
        : []),
      ...(f.outboundFlightNumber === split.flightNumber && f.std && f.departureFlightDate
        ? [{ flightId: f.id, part: "DEPARTURE_PART" as const, flightNumber: split.flightNumber, operatingDay: dayText(f.departureFlightDate)!, scheduled: f.std }]
        : []),
    ])
    .sort((a, b) => a.scheduled.getTime() - b.scheduled.getTime());
}

/** The unmatched messages, newest first, with the parts they may go to; or the discarded ones. */
export async function listUnmatched(discarded: boolean) {
  const rows = await prisma.message.findMany({
    where: { direction: "INBOUND", flightId: null, discardedAt: discarded ? { not: null } : null },
    include: {
      apiKey: { select: { name: true } },
      createdBy: { select: { name: true } },
      discardedBy: { select: { name: true } },
    },
    orderBy: { receivedAt: "desc" },
    take: 200,
  });
  const airlines = (await prisma.airline.findMany({ select: { id: true, iataCode: true } })).map((a) => ({ id: a.id, code: a.iataCode }));
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      warnings: row.warnings as unknown as TelexWarning[],
      candidates: discarded ? [] : await candidateParts(row, airlines),
    })),
  );
}

/** A message of a flight as its "Üzenetek" tab shows it. */
export async function listFlightMessages(flightId: string) {
  const rows = await prisma.message.findMany({
    where: { flightId },
    include: {
      apiKey: { select: { name: true } },
      createdBy: { select: { name: true } },
      deliveries: { orderBy: { attemptedAt: "asc" } },
    },
    orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
  });
  return rows.map((row) => ({
    ...row,
    parsedMessage: parsedOf(row),
    stored: row.parsed as unknown as StoredParsed,
    warnings: row.warnings as unknown as TelexWarning[],
  }));
}

export type FlightMessage = Awaited<ReturnType<typeof listFlightMessages>>[number];

/**
 * The messages of one flight part by version: per type and kind the current
 * version first, then the earlier ones, the newest group first.
 */
export function versionGroups(rows: readonly FlightMessage[], part: Part): { key: string; versions: FlightMessage[] }[] {
  const groups = new Map<string, FlightMessage[]>();
  for (const row of rows) {
    if (row.part !== part) continue;
    const key = row.versionKey ?? row.id;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups].map(([key, versions]) => ({
    key,
    versions: [...versions].sort((a, b) => Number(b.current) - Number(a.current) || b.receivedAt.getTime() - a.receivedAt.getTime()),
  }));
}
