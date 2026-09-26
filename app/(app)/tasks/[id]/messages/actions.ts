"use server";

import { refresh } from "next/cache";
import { listDelayRecords } from "@/lib/data/delays";
import { channelSetup, headerLineOf, recipientsFor, sendOutbound } from "@/lib/data/outbound";
import { flightPartAgents, getTaskView, taskAssignment } from "@/lib/data/tasks";
import { prisma } from "@/lib/db";
import { normaliseRegistration } from "@/lib/flight";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canSendPartMessage, canViewTask } from "@/lib/permissions";
import { getCurrentUser, type CurrentUser } from "@/lib/session";
import { deliveryDecision, typeBText } from "@/lib/telex/delivery";
import { warningText } from "@/lib/telex/describe";
import { generateDepartureMvt } from "@/lib/telex/generate";
import { parseHeader } from "@/lib/telex/header";
import { parseLocalDateTime } from "@/lib/time";

// The departure MVT (CLAUDE.md, 7. mérföldkő): a preview from the flight's
// data and records, which the user may edit, then sending the approved text.
// The arrival and the correction MVT wait for samples.

const t = messages.outbound;

export interface MvtValues {
  registration: string;
  airborne: string;
  estimatedArrival: string;
  destination: string;
  si: string;
}

export type PreviewState = {
  error?: string;
  values?: MvtValues;
  text?: string;
  warnings?: string[];
  recipients?: { address: string; channel: string; note: string | null }[];
  /** The text with its Type B envelope, for the SITA recipients to copy. */
  typeB?: string | null;
};

export type SendState = { error?: string; deliveries?: string[]; warnings?: string[] };

/** The task, its flight's departure, and whether the user may send its messages. */
async function load(taskId: string): Promise<{ user: CurrentUser; flightId: string; offBlock: Date | null } | { error: string }> {
  const user = await getCurrentUser();
  const task = await getTaskView(taskId);
  if (!user || !task || !canViewTask(user, taskAssignment(task))) return { error: messages.errors.notFound };
  const { departure } = await flightPartAgents(task.flight.id);
  if (!canSendPartMessage(user, departure)) return { error: messages.errors.forbidden };
  if (!task.flight.std) return { error: t.errors.noPart };
  if (task.flight.departureCancelled) return { error: t.errors.cancelled };
  return { user, flightId: task.flight.id, offBlock: task.timeline.effectiveAtd };
}

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

export async function previewMvt(taskId: string, _previous: PreviewState, formData: FormData): Promise<PreviewState> {
  const values: MvtValues = {
    registration: text(formData, "registration"),
    airborne: text(formData, "airborne"),
    estimatedArrival: text(formData, "estimatedArrival"),
    destination: text(formData, "destination").toUpperCase(),
    si: text(formData, "si"),
  };
  const loaded = await load(taskId);
  if ("error" in loaded) return { error: loaded.error, values };
  if (!loaded.offBlock) return { error: t.noAtd, values };

  const registration = normaliseRegistration(values.registration);
  if (!registration || registration.length < 2 || registration.length > 10) return { error: t.errors.registration, values };
  if (values.destination && !/^[A-Z]{3}$/.test(values.destination)) return { error: t.errors.destination, values };
  const airborne = values.airborne ? parseLocalDateTime(values.airborne) : null;
  const estimatedArrival = values.estimatedArrival ? parseLocalDateTime(values.estimatedArrival) : null;
  if ((values.airborne && !airborne) || (values.estimatedArrival && !estimatedArrival)) return { error: t.errors.time, values };
  if (estimatedArrival && !values.destination) return { error: t.errors.estimateNeedsDestination, values };

  const flight = await prisma.flight.findUniqueOrThrow({
    where: { id: loaded.flightId },
    select: { outboundFlightNumber: true, departureFlightDate: true, airlineId: true },
  });
  const delays = await listDelayRecords(loaded.flightId);
  const generated = generateDepartureMvt({
    flightNumber: flight.outboundFlightNumber!,
    operatingDay: flight.departureFlightDate!.toISOString().slice(0, 10),
    registration,
    offBlock: loaded.offBlock,
    airborne,
    estimatedArrival,
    destination: values.destination || null,
    delays: delays.map((d) => ({ code: d.code, minutes: d.minutes })),
    si: values.si || null,
  });

  const { setup } = await channelSetup();
  const recipients = await recipientsFor(flight.airlineId, "MVT");
  const sita = recipients.filter((r) => r.channel === "SITA").map((r) => r.address);
  return {
    values,
    text: generated.text,
    warnings: generated.warnings.map(warningText),
    recipients: recipients.map((r) => {
      const decision = deliveryDecision(r, setup);
      return { address: r.address, channel: r.channel, note: decision.send ? null : t.notSendable[decision.reason] };
    }),
    typeB: sita.length > 0 ? typeBText(sita, setup.senderTypeB, new Date(), generated.text) : null,
  };
}

export async function sendMvt(taskId: string, _previous: SendState, formData: FormData): Promise<SendState> {
  const loaded = await load(taskId);
  if ("error" in loaded) return { error: loaded.error };
  const body = String(formData.get("text") ?? "");

  // The approved text must still be this flight's departure.
  const flight = await prisma.flight.findUniqueOrThrow({
    where: { id: loaded.flightId },
    select: { outboundFlightNumber: true, departureFlightDate: true },
  });
  const header = parseHeader(headerLineOf(body) ?? "");
  const day = Number(flight.departureFlightDate?.toISOString().slice(8, 10));
  const headerDay = header ? ("day" in header.date ? header.date.day : Number(header.date.date.slice(8, 10))) : null;
  if (!header || header.flightNumber !== flight.outboundFlightNumber || headerDay !== day) return { error: t.errors.wrongFlight };

  const result = await sendOutbound(loaded.flightId, "DEPARTURE_PART", "MVT", body, loaded.user.id);
  if (!result.ok) return { error: t.errors[result.error === "notFound" ? "noPart" : result.error] };
  refresh();
  return {
    warnings: result.warnings.map(warningText),
    deliveries: result.deliveries.map((d) =>
      fmt(t.delivery, { recipient: d.recipient, channel: d.channel, status: d.error ? `${t.status[d.status]} (${d.error})` : t.status[d.status] }),
    ),
  };
}
