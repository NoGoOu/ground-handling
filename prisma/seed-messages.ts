import { SAMPLES } from "@/lib/telex/samples.fixture";
import type { SeedFlight } from "./seed-data";

// Demo messages (CLAUDE.md, 7. mérföldkő, 12. lépés), built on the samples of
// docs/messages.md and fitted to the demo flights of the run day. All times in
// messages are UTC. Addresses are made up and cannot be delivered.

export interface SeedMessage {
  text: string;
  receivedAt: Date;
}

const pad = (n: number) => String(n).padStart(2, "0");
const ddhhmm = (date: Date) => `${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}`;
const hhmm = (date: Date) => `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}`;
const plus = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60_000);

/** The day of a flight's operating date in the header: the departure day, local. */
const headerDay = (date: Date) =>
  pad(Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Budapest", day: "2-digit" }).format(date)));

/** The three delay codes of the samples; their descriptions come from the owner of the project. */
export const SEED_DELAY_CODES = ["36", "68", "93"] as const;

/** A made-up address book: example.invalid never resolves, and there is no SITA gateway. */
export const SEED_ADDRESSES = [
  { airline: "ZZ", messageType: "MVT", channel: "EMAIL", address: "ops-zz@example.invalid" },
  { airline: "ZZ", messageType: "MVT", channel: "SITA", address: "STNKKZZ" },
  { airline: "FR", messageType: "MVT", channel: "EMAIL", address: "ops-fr@example.invalid" },
] as const;

export const SEED_SENDER = { senderEmail: "ground-handling@example.invalid", senderTypeB: "BUDGHZZ" };

export function buildSeedMessages(flights: readonly SeedFlight[]): SeedMessage[] {
  const byNumber = (number: string) => flights.find((f) => f.outboundFlightNumber === number || f.inboundFlightNumber === number)!;

  // ZZ1101/1102: departed six minutes late; the departure MVT, the LDM and a narrowbody CPM.
  const quick = byNumber("ZZ1102");
  const atd = quick.atd!;
  const day = headerDay(quick.std!);
  const departureMvt = [
    "MVT",
    `ZZ1102/${day}.HAZZA.BUD`,
    `AD${ddhhmm(atd)}/${ddhhmm(plus(atd, 8))} EA${ddhhmm(plus(atd, 128))} STN`,
    "DL93/0006",
    "SI LATE BOARDING",
  ].join("\n");
  const ldm = [
    "LDM",
    `ZZ1102/${day}.HAZZA.Y189.2/4`,
    "-STN.80/90/5/2.T1450.1/300.3/600.4/550.PAX/177",
    "SI STN BP/120.B/1400.C/50",
  ].join("\n");
  const cpm = [
    "CPM",
    `ZZ1102/${day}.HAZZA.1450.BUD`,
    "-1/STN/300/B",
    "-2/NIL",
    "-3/STN/600/B",
    "-4/STN/500/B",
    "-41/STN/50/C.PER",
  ].join("\n");

  // ZZ1203: the origin's MVT sends the estimate later than the one typed in.
  const long = byNumber("ZZ1203");
  const eta = plus(long.sta!, 25);
  const originMvt = [
    "MVT",
    `ZZ1203/${headerDay(long.sta!)}.HAZZB.STN`,
    `AD${ddhhmm(plus(eta, -135))}/${ddhhmm(plus(eta, -125))} EA${hhmm(eta)} BUD`,
    "DL93/0020",
  ].join("\n");

  // ZZ1306: the P7 5535/16 samples fitted to it, with ULD stacks and the known UCM–CPM error.
  const freight = byNumber("ZZ1306");
  const freightDay = headerDay(freight.std!);
  const fit = (sample: string) => sample.replace("P75535/16.URNPA", `ZZ1306/${freightDay}.HAZZC`).replace(/OSR/g, "STN");

  return [
    { text: departureMvt, receivedAt: plus(atd, 10) },
    { text: ldm, receivedAt: plus(quick.std!, -20) },
    { text: cpm, receivedAt: plus(quick.std!, -19) },
    { text: originMvt, receivedAt: plus(eta, -120) },
    { text: fit(SAMPLES.LDM_P7), receivedAt: plus(freight.std!, -40) },
    { text: fit(SAMPLES.CPM_P7), receivedAt: plus(freight.std!, -39) },
    { text: fit(SAMPLES.UCM_P7_OUT), receivedAt: plus(freight.std!, -38) },
    // Not ours: its airline is not in the system, so it waits among the unmatched.
    { text: SAMPLES.MVT_ET, receivedAt: plus(quick.std!, 60) },
    // Recognised but not supported: only its type, flight and date are logged.
    { text: `PTM\nZZ1408/${headerDay(byNumber("ZZ1408").std!)}.HAZZD.BUD\n-STN 12 PAX`, receivedAt: plus(quick.std!, 61) },
  ];
}
