import { describe, expect, it } from "vitest";
import { bearerKey, MAX_API_BYTES, readApiBody } from "@/lib/telex/api-request";
import { resultSummary } from "@/lib/telex/describe";
import { SAMPLES } from "@/lib/telex/samples.fixture";

const NOW = new Date("2026-09-17T07:30:00Z");

describe("the body of POST /api/messages", () => {
  it("takes raw text as it is, received now", () => {
    expect(readApiBody("text/plain", SAMPLES.MVT_ET, NOW)).toEqual({ ok: true, text: SAMPLES.MVT_ET, source: null, receivedAt: NOW });
    expect(readApiBody(null, SAMPLES.MVT_ET, NOW)).toMatchObject({ ok: true });
  });

  it("takes JSON with text, source and the time it was received", () => {
    const body = JSON.stringify({ text: SAMPLES.MVT_ET, source: " SITA gateway ", receivedAt: "2026-09-17T09:20:00+02:00" });
    expect(readApiBody("application/json; charset=utf-8", body, NOW)).toEqual({
      ok: true,
      text: SAMPLES.MVT_ET,
      source: "SITA gateway",
      receivedAt: new Date("2026-09-17T07:20:00Z"),
    });
  });

  it("refuses a body it cannot use", () => {
    const json = (value: unknown) => readApiBody("application/json", JSON.stringify(value), NOW);
    expect(readApiBody("application/json", "{text:", NOW)).toEqual({ ok: false, error: "badJson" });
    expect(json(["MVT"])).toEqual({ ok: false, error: "badJson" });
    expect(json({ text: " " })).toEqual({ ok: false, error: "noText" });
    expect(json({ text: "MVT", source: 5 })).toEqual({ ok: false, error: "badSource" });
    // A time without its offset would be read in the server's zone.
    expect(json({ text: "MVT", receivedAt: "2026-09-17T07:20" })).toEqual({ ok: false, error: "badReceivedAt" });
    expect(json({ text: "MVT", receivedAt: "yesterday" })).toEqual({ ok: false, error: "badReceivedAt" });
    expect(readApiBody("text/plain", "", NOW)).toEqual({ ok: false, error: "noText" });
  });

  it("has a size limit of 256 KB, counted in bytes", () => {
    expect(readApiBody("text/plain", "x".repeat(MAX_API_BYTES), NOW)).toMatchObject({ ok: true });
    expect(readApiBody("text/plain", "x".repeat(MAX_API_BYTES + 1), NOW)).toEqual({ ok: false, error: "tooLarge" });
    expect(readApiBody("text/plain", "é".repeat(MAX_API_BYTES / 2 + 1), NOW)).toEqual({ ok: false, error: "tooLarge" });
  });
});

describe("the API key of a request", () => {
  it("reads a bearer key of ours", () => {
    const key = `ghk_${"a".repeat(32)}`;
    expect(bearerKey(`Bearer ${key}`)).toBe(key);
    expect(bearerKey(`bearer  ${key}`)).toBe(key);
    expect(bearerKey(`Basic ${key}`)).toBeNull();
    expect(bearerKey("Bearer something")).toBeNull();
    expect(bearerKey(null)).toBeNull();
  });
});

describe("the summary of a call", () => {
  it("counts what happened to the messages", () => {
    expect(
      resultSummary([
        { status: "stored", type: "MVT", unmatchedReason: null },
        { status: "stored", type: "LDM", unmatchedReason: "none" },
        { status: "duplicate", type: "CPM" },
        { status: "unsupported", type: "PTM" },
      ]),
    ).toBe("4 üzenet: 2 tárolva (ebből 1 párosítatlan), 1 duplikátum, 1 nem támogatott.");
  });
});
