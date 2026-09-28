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
import { correctionOf, generateArrivalMvt, generateDepartureMvt } from "@/lib/telex/generate";
import { parseHeader } from "@/lib/telex/header";
import type { Part } from "@/lib/telex/match";
import type { TelexWarning } from "@/lib/telex/warnings";
import { parseLocalDateTime } from "@/lib/time";

// The MVTs we send (CLAUDE.md, 7. and 8. mérföldkő): the departure MVT (AD)
// and the arrival MVT (AA) from the flight's data and records, and a
// correction (COR) of either. A preview the user may edit, then sending the
// approved text.

const t = messages.outbound;

export type MvtKind = "AD" | "AA";

export interface MvtValues {
  registration: string;
  airborne: string;
  estimatedArrival: string;
  destination: string;
  touchdown: string;
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

const partOf = (kind: MvtKind): Part => (kind === "AD" ? "DEPARTURE_PART" : "ARRIVAL_PART");

/** The task, its flight part, and whether the user may send its messages. */
async function load(
  taskId: string,
  kind: MvtKind,
): Promise<{ user: CurrentUser; flightId: string; actual: Date | null } | { error: string }> {
  const user = await getCurrentUser();
  const task = await getTaskView(taskId);
  if (!user || !task || !canViewTask(user, taskAssignment(task))) return { error: messages.errors.notFound };
  const agents = await flightPartAgents(task.flight.id);
  if (!canSendPartMessage(user, kind === "AD" ? agents.departure : agents.arrival)) return { error: messages.errors.forbidden };
  const has = kind === "AD" ? task.flight.std : task.flight.sta;
  const cancelled = kind === "AD" ? task.flight.departureCancelled : task.flight.arrivalCancelled;
  if (!has) return { error: t.errors.noPart };
  if (cancelled) return { error: t.errors.cancelled };
  // The effective off-block or on-block the MVT carries.
  return { user, flightId: task.flight.id, actual: kind === "AD" ? task.timeline.effectiveAtd : task.timeline.effectiveAta };
}

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

export async function previewMvt(
  taskId: string,
  kind: MvtKind,
  correction: boolean,
  _previous: PreviewState,
  formData: FormData,
): Promise<PreviewState> {
  const values: MvtValues = {
    registration: text(formData, "registration"),
    airborne: text(formData, "airborne"),
    estimatedArrival: text(formData, "estimatedArrival"),
    destination: text(formData, "destination").toUpperCase(),
    touchdown: text(formData, "touchdown"),
    si: text(formData, "si"),
  };
  const loaded = await load(taskId, kind);
  if ("error" in loaded) return { error: loaded.error, values };
  if (!loaded.actual) return { error: kind === "AD" ? t.noAtd : t.noAta, values };

  const registration = normaliseRegistration(values.registration);
  if (!registration || registration.length < 2 || registration.length > 10) return { error: t.errors.registration, values };
  const time = (value: string) => (value ? parseLocalDateTime(value) : null);
  const [airborne, estimatedArrival, touchdown] = [time(values.airborne), time(values.estimatedArrival), time(values.touchdown)];
  if ((values.airborne && !airborne) || (values.estimatedArrival && !estimatedArrival) || (values.touchdown && !touchdown)) {
    return { error: t.errors.time, values };
  }

  const flight = await prisma.flight.findUniqueOrThrow({
    where: { id: loaded.flightId },
    select: { inboundFlightNumber: true, outboundFlightNumber: true, arrivalFlightDate: true, departureFlightDate: true, airlineId: true },
  });
  let generated: { text: string; warnings: TelexWarning[] };
  if (kind === "AD") {
    if (values.destination && !/^[A-Z]{3}$/.test(values.destination)) return { error: t.errors.destination, values };
    if (estimatedArrival && !values.destination) return { error: t.errors.estimateNeedsDestination, values };
    const delays = await listDelayRecords(loaded.flightId);
    generated = generateDepartureMvt({
      flightNumber: flight.outboundFlightNumber!,
      operatingDay: flight.departureFlightDate!.toISOString().slice(0, 10),
      registration,
      offBlock: loaded.actual,
      airborne,
      estimatedArrival,
      destination: values.destination || null,
      delays: delays.map((d) => ({ code: d.code, minutes: d.minutes })),
      si: values.si || null,
    });
  } else {
    generated = generateArrivalMvt({
      flightNumber: flight.inboundFlightNumber!,
      operatingDay: flight.arrivalFlightDate!.toISOString().slice(0, 10),
      registration,
      touchdown,
      onBlock: loaded.actual,
      si: values.si || null,
    });
  }
  const body = correction ? correctionOf(generated.text) : generated.text;

  const { setup } = await channelSetup();
  const recipients = await recipientsFor(flight.airlineId, "MVT");
  const sita = recipients.filter((r) => r.channel === "SITA").map((r) => r.address);
  return {
    values,
    text: body,
    warnings: generated.warnings.map(warningText),
    recipients: recipients.map((r) => {
      const decision = deliveryDecision(r, setup);
      return { address: r.address, channel: r.channel, note: decision.send ? null : t.notSendable[decision.reason] };
    }),
    typeB: sita.length > 0 ? typeBText(sita, setup.senderTypeB, new Date(), body) : null,
  };
}

export async function sendMvt(taskId: string, kind: MvtKind, _previous: SendState, formData: FormData): Promise<SendState> {
  const loaded = await load(taskId, kind);
  if ("error" in loaded) return { error: loaded.error };
  const body = String(formData.get("text") ?? "");

  // The approved text must still name this flight part.
  const flight = await prisma.flight.findUniqueOrThrow({
    where: { id: loaded.flightId },
    select: { inboundFlightNumber: true, outboundFlightNumber: true, arrivalFlightDate: true, departureFlightDate: true },
  });
  const [flightNumber, date] =
    kind === "AD" ? [flight.outboundFlightNumber, flight.departureFlightDate] : [flight.inboundFlightNumber, flight.arrivalFlightDate];
  const header = parseHeader(headerLineOf(body) ?? "");
  const day = Number(date?.toISOString().slice(8, 10));
  const headerDay = header ? ("day" in header.date ? header.date.day : Number(header.date.date.slice(8, 10))) : null;
  if (!header || header.flightNumber !== flightNumber || headerDay !== day) return { error: t.errors.wrongFlight };

  const result = await sendOutbound(loaded.flightId, partOf(kind), "MVT", body, loaded.user.id);
  if (!result.ok) return { error: t.errors[result.error === "notFound" ? "noPart" : result.error] };
  refresh();
  return {
    warnings: result.warnings.map(warningText),
    deliveries: result.deliveries.map((d) =>
      fmt(t.delivery, { recipient: d.recipient, channel: d.channel, status: d.error ? `${t.status[d.status]} (${d.error})` : t.status[d.status] }),
    ),
  };
}
