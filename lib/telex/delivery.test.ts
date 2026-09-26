import { describe, expect, it } from "vitest";
import { deliveryDecision, smtpFromEnv, typeBText, type ChannelSetup } from "@/lib/telex/delivery";

const NOTHING: ChannelSetup = { email: false, sita: false, senderEmail: null, senderTypeB: null };

describe("sending, recipient by recipient", () => {
  it("sends nothing without a channel set up: the safe default", () => {
    expect(deliveryDecision({ channel: "EMAIL", address: "ops@example.invalid" }, NOTHING)).toEqual({ send: false, reason: "noEmailChannel" });
    expect(deliveryDecision({ channel: "SITA", address: "BUDXXZZ" }, NOTHING)).toEqual({ send: false, reason: "noGateway" });
  });

  it("needs the sender too", () => {
    const email = { ...NOTHING, email: true };
    expect(deliveryDecision({ channel: "EMAIL", address: "ops@example.invalid" }, email)).toEqual({ send: false, reason: "noSenderEmail" });
    expect(deliveryDecision({ channel: "EMAIL", address: "ops@example.invalid" }, { ...email, senderEmail: "gh@example.invalid" })).toEqual({
      send: true,
    });
  });

  it("still has no SITA gateway: its kind is open", () => {
    const all = { email: true, sita: false, senderEmail: "gh@example.invalid", senderTypeB: "BUDGHZZ" };
    expect(deliveryDecision({ channel: "SITA", address: "BUDXXZZ" }, all)).toEqual({ send: false, reason: "noGateway" });
  });
});

describe("the Type B text", () => {
  it("puts the addresses and the sender before the message", () => {
    expect(typeBText(["BUDXXZZ", "HDQYYZZ"], "BUDGHZZ", new Date("2026-09-17T07:20:00Z"), "MVT\nET3365/12.ETBAB.BUD")).toBe(
      "QU BUDXXZZ HDQYYZZ\n.BUDGHZZ 170720\nMVT\nET3365/12.ETBAB.BUD",
    );
  });
});

describe("SMTP from the environment", () => {
  it("is not set up without a host", () => {
    expect(smtpFromEnv({})).toBeNull();
    expect(smtpFromEnv({ SMTP_HOST: " " })).toBeNull();
  });

  it("reads host, port, security and credentials", () => {
    expect(smtpFromEnv({ SMTP_HOST: "smtp.example.invalid", SMTP_PORT: "465", SMTP_SECURE: "true", SMTP_USER: "gh", SMTP_PASSWORD: "x" })).toEqual({
      host: "smtp.example.invalid",
      port: 465,
      secure: true,
      user: "gh",
      password: "x",
    });
    expect(smtpFromEnv({ SMTP_HOST: "smtp.example.invalid" })).toMatchObject({ port: 587, secure: false, user: null });
  });
});
