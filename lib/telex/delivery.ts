// Sending a message (CLAUDE.md, 7. mérföldkő, "Küldés"): per recipient,
// whether a real channel is set up. The safe default: without one nothing
// leaves the system, the delivery is only logged. Pure.

export type Channel = "EMAIL" | "SITA";

export interface Recipient {
  channel: Channel;
  address: string;
}

export interface ChannelSetup {
  /** SMTP is set up in the environment. */
  email: boolean;
  /** No SITA gateway exists yet; the kind of gateway is still open. */
  sita: boolean;
  senderEmail: string | null;
  senderTypeB: string | null;
}

export type NotSendableReason = "noEmailChannel" | "noSenderEmail" | "noGateway" | "noSenderTypeB";

export type DeliveryDecision = { send: true } | { send: false; reason: NotSendableReason };

export function deliveryDecision(recipient: Recipient, setup: ChannelSetup): DeliveryDecision {
  if (recipient.channel === "EMAIL") {
    if (!setup.email) return { send: false, reason: "noEmailChannel" };
    if (!setup.senderEmail) return { send: false, reason: "noSenderEmail" };
    return { send: true };
  }
  if (!setup.sita) return { send: false, reason: "noGateway" };
  if (!setup.senderTypeB) return { send: false, reason: "noSenderTypeB" };
  return { send: true };
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The text with its Type B envelope, for a SITA gateway or to copy by hand:
 * "QU" and the addresses, then the sender and the day and time (UTC).
 */
export function typeBText(addresses: readonly string[], sender: string | null, at: Date, text: string): string {
  const stamp = `${pad(at.getUTCDate())}${pad(at.getUTCHours())}${pad(at.getUTCMinutes())}`;
  return [`QU ${addresses.join(" ")}`, `.${sender ?? "???????"} ${stamp}`, text].join("\n");
}

/** SMTP settings from the environment (never from the database); null when not set up. */
export interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string | null;
  password: string | null;
}

export function smtpFromEnv(env: Record<string, string | undefined>): SmtpSettings | null {
  const host = env.SMTP_HOST?.trim();
  if (!host) return null;
  const port = Number(env.SMTP_PORT ?? 587);
  return {
    host,
    port: Number.isInteger(port) && port > 0 ? port : 587,
    secure: env.SMTP_SECURE === "true",
    user: env.SMTP_USER?.trim() || null,
    password: env.SMTP_PASSWORD || null,
  };
}
