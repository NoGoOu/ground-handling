import { SAMPLES } from "@/lib/telex/samples.fixture";
import type { SeedFlight } from "./seed-data";
import { textPdf } from "./seed-pdf";

// Demo messages (CLAUDE.md, 7. mérföldkő, 12. lépés; 8. mérföldkő, 7. lépés),
// built on the samples of docs/messages.md and fitted to the demo flights of
// the run day. All times in messages are UTC. Addresses are made up and
// cannot be delivered.

export interface SeedMessage {
  text: string;
  receivedAt: Date;
}

const pad = (n: number) => String(n).padStart(2, "0");
const ddhhmm = (date: Date) => `${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}`;
const hhmm = (date: Date) => `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}`;
const plus = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60_000);
/** EOBD of a slot message: "YYMMDD" (UTC). */
const eobd = (date: Date) => date.toISOString().slice(2, 10).replace(/-/g, "");

/** The day of a flight's operating date in the header: the departure day, local. */
const headerDay = (date: Date) =>
  pad(Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Budapest", day: "2-digit" }).format(date)));

/** "26SEP": the day and month of a PSM or PTM header. */
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const headerDayMonth = (date: Date) =>
  `${headerDay(date)}${MONTHS[Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Budapest", month: "numeric" }).format(date)) - 1]}`;

/**
 * The default, common delay code table: the codes of the samples (36, 68, 93)
 * and of the slot causes (81, 82), described by the IATA standard (CLAUDE.md,
 * 8. mérföldkő, utómunka).
 */
export const SEED_DELAY_CODES = [
  { code: "36", description: "Tankolás vagy üzemanyag-leeresztés (üzemanyag-szállító)" },
  { code: "68", description: "A kabinszemélyzet hibája vagy külön kérése" },
  { code: "81", description: "Útvonali légiforgalmi korlátozás vagy kapacitás" },
  { code: "82", description: "Útvonali légiforgalmi korlátozás létszámhiány vagy berendezéshiba miatt" },
  { code: "93", description: "Gépforgás: a gép késve érkezett egy másik járatról vagy az előző szakaszról" },
] as const;

/**
 * The demo airline's own delay code document: a sample we made, not a real
 * airline's. The other airline has none, so there the common table opens.
 */
export const SEED_DELAY_DOCUMENT = { airline: "ZZ", fileName: "zz-keseskodok-minta.pdf" } as const;

export function seedDelayCodePdf(): Uint8Array {
  return textPdf([
    "MINTA - Demo Fapados (ZZ): keseskodok",
    "Sajat keszitesu mintadokumentum, nem valodi legitarsasagi dokumentum.",
    "",
    "36   Tankolas vagy uzemanyag-leeresztes (uzemanyag-szallito)",
    "36A  Az uzemanyag-szallito kesve erkezett a gephez",
    "68   A kabinszemelyzet hibaja vagy kulon kerese",
    "68A  A kabinszemelyzet kesve erkezett a gephez",
    "81   Utvonali legiforgalmi korlatozas vagy kapacitas",
    "82   Utvonali legiforgalmi korlatozas letszamhiany vagy berendezeshiba miatt",
    "93   Gepforgas: a gep kesve erkezett az elozo szakaszrol",
    "93A  Gepforgas: gepcsere miatt",
  ]);
}

/** A made-up address book: example.invalid never resolves, and there is no SITA gateway. */
export const SEED_ADDRESSES = [
  { airline: "ZZ", messageType: "MVT", channel: "EMAIL", address: "ops-zz@example.invalid" },
  { airline: "ZZ", messageType: "MVT", channel: "SITA", address: "STNKKZZ" },
  { airline: "FR", messageType: "MVT", channel: "EMAIL", address: "ops-fr@example.invalid" },
] as const;

export const SEED_SENDER = { senderEmail: "ground-handling@example.invalid", senderTypeB: "BUDGHZZ" };

/** The airports of the demo flights and of the samples (8. mérföldkő): slot messages name them by ICAO. */
export const SEED_AIRPORTS = [
  { iataCode: "BUD", icaoCode: "LHBP", name: "Budapest Liszt Ferenc" },
  { iataCode: "STN", icaoCode: "EGSS", name: "London Stansted" },
  { iataCode: "BVA", icaoCode: "LFOB", name: "Beauvais" },
  { iataCode: "CHQ", icaoCode: "LGSA", name: "Chania" },
  { iataCode: "IST", icaoCode: "LTFM", name: "Istanbul" },
  { iataCode: "FRA", icaoCode: "EDDF", name: "Frankfurt" },
  { iataCode: "OSR", icaoCode: "LKMT", name: "Ostrava" },
  { iataCode: "RMO", icaoCode: "LUKK", name: "Chişinău" },
  { iataCode: "HKG", icaoCode: "VHHH", name: "Hong Kong" },
  { iataCode: "CAN", icaoCode: "ZGGG", name: "Guangzhou" },
  { iataCode: "STR", icaoCode: "EDDS", name: "Stuttgart" },
  { iataCode: "ALC", icaoCode: "LEAL", name: "Alicante" },
] as const;

const icaoOf = (iata: string) => SEED_AIRPORTS.find((a) => a.iataCode === iata)!.icaoCode;

/** A slot message for a demo departure (the ADEXP of the SAM and SRM samples). */
function slotMessage(
  title: "SAM" | "SRM",
  flight: SeedFlight,
  ifplid: string,
  ctot: Date,
  cause: string,
  regulations: string[],
): string {
  return [
    `-TITLE ${title}`,
    `-ARCID ZZX${flight.outboundFlightNumber!.slice(3)}`,
    `-IFPLID ${ifplid}`,
    "-ADEP LHBP",
    `-ADES ${icaoOf(flight.destination!)}`,
    `-EOBD ${eobd(flight.std!)}`,
    `-EOBT ${hhmm(flight.std!)}`,
    `-${title === "SAM" ? "CTOT" : "NEWCTOT"} ${hhmm(ctot)}`,
    ...regulations.map((r) => `-REGUL ${r}`),
    "-TAXITIME 0012",
    `-REGCAUSE ${cause}`,
  ].join("\n");
}

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
    "-STN.80/90/5/2.T1450.1/300.3/600.4/550.PAX/175",
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
  // Its arrival at STN, sent again as a correction (the TK1034 sample): for information.
  const destinationArrival = ["COR", "MVT", `ZZ1102/${day}.HAZZA.STN`, `AA${ddhhmm(plus(atd, 124))}/${ddhhmm(plus(atd, 131))}`].join(
    "\n",
  );

  // ZZ1101: the Lufthansa messages of 27 September fitted to the arrival, with
  // the framed instruction and the DAA in the SI; its ATA stays the system's.
  const arrivalDay = headerDay(quick.sta!);
  const lufthansa = (sample: string) => sample.replace("LH1338/27.DAIQT", `ZZ1101/${arrivalDay}.HAZZA`);
  const arrivalMvt = ["MVT", `ZZ1101/${arrivalDay}.HAZZA.BUD`, `AA${ddhhmm(plus(quick.ata!, -4))}/${ddhhmm(quick.ata!)}`].join("\n");
  const arrivalPsm = SAMPLES.PSM_LH.replace("LH1338/27SEP FRA PART1", `ZZ1101/${headerDayMonth(quick.sta!)} FRA PART1`);

  // ZZ1203: the origin's MVT sends the estimate later than the one typed in.
  const long = byNumber("ZZ1203");
  const eta = plus(long.sta!, 25);
  const originMvt = [
    "MVT",
    `ZZ1203/${headerDay(long.sta!)}.HAZZB.STN`,
    `AD${ddhhmm(plus(eta, -135))}/${ddhhmm(plus(eta, -125))} EA${hhmm(eta)} BUD`,
    "DL93/0020",
  ].join("\n");

  // ZZ1204 to IST: the Turkish PSM and PTM (names never stored, only counts).
  const toIst = byNumber("ZZ1204");
  const istDay = headerDayMonth(toIst.std!);
  const turkishPsm = SAMPLES.PSM_TK.replace("TK1034/26SEP BUD PART1", `ZZ1204/${istDay} BUD PART1`);
  const turkishPtm = SAMPLES.PTM_TK.replace("TK1034/26SEP BUDIST PART2", `ZZ1204/${istDay} BUDIST PART2`);

  // ZZ1306 to CHQ: the P7 5535/16 samples fitted to it, with ULD stacks and the known UCM–CPM error;
  // a slot allocated and then revised (SAM, SRM of one flight plan).
  const freight = byNumber("ZZ1306");
  const freightDay = headerDay(freight.std!);
  const fit = (sample: string) => sample.replace("P75535/16.URNPA", `ZZ1306/${freightDay}.HAZZC`).replace(/OSR/g, "CHQ");
  const sam = slotMessage("SAM", freight, "AA90001306", plus(freight.std!, 20), "CE 81", ["LGSAA28"]);
  const srm = slotMessage("SRM", freight, "AA90001306", plus(freight.std!, 35), "CE 81", ["LGSAA28", "LGMW228"]);

  // ZZ1408 to BVA: its ETD is later than the slot allows, so the slot warns.
  const late = byNumber("ZZ1408");
  const lateSam = slotMessage("SAM", late, "AA90001408", plus(late.std!, 5), "SE 82", ["YB5LL28A"]);

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
    // A PTM of transfers, without names: only its counts are stored.
    {
      text: `PTM\nZZ1408/${headerDayMonth(late.std!)} BUDBVA PART1\nZZ0901 BOM 2Y 2B31K\nZZ0903 DXB 1Y 1B19K\nENDPTM`,
      receivedAt: plus(quick.std!, 61),
    },
    // 8. mérföldkő.
    { text: lufthansa(SAMPLES.LDM_LH), receivedAt: plus(quick.sta!, -30) },
    { text: lufthansa(SAMPLES.CPM_LH), receivedAt: plus(quick.sta!, -29) },
    { text: arrivalPsm, receivedAt: plus(quick.sta!, -60) },
    { text: arrivalMvt, receivedAt: plus(quick.ata!, 5) },
    { text: destinationArrival, receivedAt: plus(atd, 140) },
    { text: turkishPsm, receivedAt: plus(toIst.std!, -90) },
    { text: turkishPtm, receivedAt: plus(toIst.std!, -80) },
    { text: sam, receivedAt: plus(freight.std!, -120) },
    { text: srm, receivedAt: plus(freight.std!, -60) },
    { text: lateSam, receivedAt: plus(late.std!, -100) },
  ];
}
