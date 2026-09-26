import nodemailer from "nodemailer";
import type { DeliveryStatus, Prisma } from "@/generated/prisma/client";
import { effectFlight, FLIGHT_SELECT } from "@/lib/data/messages";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { SETTINGS_ID } from "@/lib/settings";
import { deliveryDecision, smtpFromEnv, type ChannelSetup, type Recipient, type SmtpSettings } from "@/lib/telex/delivery";
import { resolveTimes, versionKey, versionKind } from "@/lib/telex/effects";
import { bodyLines } from "@/lib/telex/header";
import type { Part } from "@/lib/telex/match";
import { parseMessage, type ParsedMessage } from "@/lib/telex/parse";
import { splitMessages, type SupportedType } from "@/lib/telex/split";
import type { TelexWarning } from "@/lib/telex/warnings";

// Messages we send (CLAUDE.md, 7. mérföldkő, "MVT előállítása és küldése"):
// stored on the flight's "Üzenetek" tab with a status per recipient. Sending
// goes through a replaceable channel; without a real one set up, it is only
// logged and nothing leaves the system. An outbound MVT does not change the
// flight's times: it was made from them.

const json = (value: unknown) => value as Prisma.InputJsonValue;

export async function channelSetup(): Promise<{ setup: ChannelSetup; smtp: SmtpSettings | null }> {
  const setting = await prisma.setting.findUnique({ where: { id: SETTINGS_ID }, select: { senderEmail: true, senderTypeB: true } });
  const smtp = smtpFromEnv(process.env);
  return {
    smtp,
    // No SITA gateway yet: its kind is still open.
    setup: { email: !!smtp, sita: false, senderEmail: setting?.senderEmail ?? null, senderTypeB: setting?.senderTypeB ?? null },
  };
}

/** The active recipients of an airline's messages of a type (the address book). */
export async function recipientsFor(airlineId: string, messageType: string): Promise<Recipient[]> {
  const entries = await prisma.addressBookEntry.findMany({
    where: { airlineId, messageType, active: true },
    select: { channel: true, address: true },
    orderBy: [{ channel: "asc" }, { address: "asc" }],
  });
  return entries;
}

async function sendEmail(smtp: SmtpSettings, from: string, to: string, subject: string, text: string) {
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.password ?? "" } : undefined,
  });
  await transport.sendMail({ from, to, subject, text });
}

export type SendResult =
  | { ok: false; error: "notOne" | "wrongType" | "notFound" | "noPart" | "cancelled" }
  | {
      ok: true;
      messageId: string;
      warnings: TelexWarning[];
      deliveries: { recipient: string; channel: Recipient["channel"]; status: DeliveryStatus; error: string | null }[];
    };

/**
 * Stores and sends a message of a flight part in the text the user approved.
 * The text must be exactly one message of the given type.
 */
export async function sendOutbound(
  flightId: string,
  part: Part,
  type: SupportedType,
  text: string,
  userId: string,
): Promise<SendResult> {
  const { messages: found } = splitMessages(text);
  if (found.length !== 1) return { ok: false, error: "notOne" };
  if (found[0].type !== type) return { ok: false, error: "wrongType" };
  const flight = await prisma.flight.findUnique({ where: { id: flightId }, select: { ...FLIGHT_SELECT, airlineId: true } });
  if (!flight) return { ok: false, error: "notFound" };
  if (!(part === "ARRIVAL_PART" ? flight.sta : flight.std)) return { ok: false, error: "noPart" };
  if (part === "ARRIVAL_PART" ? flight.arrivalCancelled : flight.departureCancelled) return { ok: false, error: "cancelled" };

  const raw = found[0] as (typeof found)[number] & { type: SupportedType };
  const parsed: ParsedMessage = parseMessage(raw);
  const times = Object.fromEntries(
    Object.entries(resolveTimes(parsed, part, effectFlight(flight))).map(([name, time]) => [name, time.toISOString()]),
  );
  const sentAt = new Date();
  // Our own messages are versioned apart from the received ones, which act on the flight.
  const key = `${versionKey(flight.id, part, parsed.type, versionKind(parsed))}|OUT`;

  const created = await prisma.$transaction(async (tx) => {
    const previous = await tx.message.findFirst({ where: { versionKey: key, current: true } });
    if (previous) await tx.message.update({ where: { id: previous.id }, data: { current: false } });
    return tx.message.create({
      data: {
        direction: "OUTBOUND",
        type: parsed.type,
        rawText: raw.text,
        source: "GENERATED",
        receivedAt: sentAt,
        flightNumber: parsed.header?.flightNumber ?? null,
        headerDate: parsed.header?.dateText ?? null,
        registration: parsed.header?.registration ?? null,
        station: parsed.type === "MVT" ? parsed.data.station : null,
        flightDate: part === "ARRIVAL_PART" ? flight.arrivalFlightDate : flight.departureFlightDate,
        parsed: json({ header: parsed.header, data: parsed.data, times }),
        warnings: json(parsed.warnings),
        flightId: flight.id,
        part,
        kind: versionKind(parsed),
        versionKey: key,
        current: true,
        supersedesId: previous?.id ?? null,
        createdById: userId,
      },
      select: { id: true },
    });
  });

  const { setup, smtp } = await channelSetup();
  const recipients = await recipientsFor(flight.airlineId, parsed.type);
  const subject = `${parsed.type} ${parsed.header?.flightNumber ?? ""}/${parsed.header?.dateText ?? ""}`.trim();
  const reasons = messages.outbound.notSendable;
  const deliveries: Extract<SendResult, { ok: true }>["deliveries"] = [];
  for (const recipient of recipients) {
    const decision = deliveryDecision(recipient, setup);
    let status: DeliveryStatus = "NOT_SENDABLE";
    let error: string | null = decision.send ? null : reasons[decision.reason];
    if (decision.send && recipient.channel === "EMAIL" && smtp && setup.senderEmail) {
      try {
        await sendEmail(smtp, setup.senderEmail, recipient.address, subject, raw.text);
        status = "SENT";
      } catch (failure) {
        status = "FAILED";
        error = failure instanceof Error ? failure.message.slice(0, 500) : String(failure);
      }
    }
    deliveries.push({ recipient: recipient.address, channel: recipient.channel, status, error });
  }
  if (deliveries.length > 0) {
    await prisma.messageDelivery.createMany({
      data: deliveries.map((d) => ({ messageId: created.id, recipient: d.recipient, channel: d.channel, status: d.status, error: d.error })),
    });
  }
  return { ok: true, messageId: created.id, warnings: parsed.warnings, deliveries };
}

/** The header line of a message text, e.g. to check it names the right flight. */
export function headerLineOf(text: string): string | null {
  const [message] = splitMessages(text).messages;
  return message ? (bodyLines(message.lines)[0] ?? null) : null;
}
