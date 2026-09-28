import { describe, expect, it } from "vitest";
import { describeWarnings } from "@/lib/telex/describe";
import { matchMessage, type MatchFlight } from "@/lib/telex/match";
import { parseMessage, type ParsedMessage } from "@/lib/telex/parse";
import type { PsmData, PtmData } from "@/lib/telex/psm";
import { PSM_LH, PSM_TK, PTM_TK } from "@/lib/telex/samples.fixture";
import { splitMessages, type SupportedType } from "@/lib/telex/split";
import { storedForm } from "@/lib/telex/stored";

function parse(text: string) {
  const [message] = splitMessages(text).messages;
  return { raw: message, parsed: parseMessage(message as typeof message & { type: SupportedType }) };
}

/** Everything that would be stored or shown of a message. */
function everything(text: string, envelope: string | null = null): string {
  const { raw, parsed } = parse(text);
  const stored = storedForm(raw, parsed, envelope);
  return JSON.stringify({ stored, header: parsed.header, data: parsed.data, warnings: parsed.warnings, texts: describeWarnings(parsed.warnings) });
}

// The names, seats and connections of the samples (replaced by the owner, still personal in kind).
const PERSONAL = ["MINTA", "ELEK", "TESZT", "ANNA", "003C", "27A", "TK0399", "26LED", "KOVACS", "JANOS"];

describe("PSM (8. mérföldkő)", () => {
  it("keeps the counts per destination, code and class of the Lufthansa PSM", () => {
    const { parsed } = parse(PSM_LH);
    expect(parsed.warnings).toEqual([]);
    expect(parsed.header).toMatchObject({ flightNumber: "LH1338", dateText: "27SEP", date: { day: 27, month: 9 }, registration: null });
    expect(parsed.data as PsmData).toEqual({
      station: "FRA",
      part: 1,
      last: true,
      destinations: [
        {
          destination: "BUD",
          pax: 1,
          ssr: 1,
          codes: [
            {
              code: "WCHR",
              byClass: [
                { cls: "C", count: 1 },
                { cls: "M", count: 0 },
              ],
            },
          ],
        },
      ],
    });
  });

  it("reads the Turkish PSM from BUD, with three classes", () => {
    const { parsed } = parse(PSM_TK);
    expect(parsed.warnings).toEqual([]);
    expect((parsed.data as PsmData).station).toBe("BUD");
    expect((parsed.data as PsmData).destinations[0]).toEqual({
      destination: "IST",
      pax: 1,
      ssr: 1,
      codes: [
        {
          code: "WCHS",
          byClass: [
            { cls: "F", count: 0 },
            { cls: "C", count: 0 },
            { cls: "Y", count: 1 },
          ],
        },
      ],
    });
  });

  it("warns when the codes do not add up to the block's SSR", () => {
    const { parsed } = parse(PSM_LH.replace("WCHR 001C 000M", "WCHR 002C 000M"));
    expect(parsed.warnings).toEqual([{ code: "psmSsrSum", params: { destination: "BUD", ssr: 1, sum: 2 } }]);
  });
});

describe("PTM (8. mérföldkő)", () => {
  it("keeps passengers, bags and kg per onward flight, destination and class", () => {
    const { parsed } = parse(PTM_TK);
    expect(parsed.warnings).toEqual([]);
    const data = parsed.data as PtmData;
    expect(data).toMatchObject({ from: "BUD", to: "IST", part: 2, last: true });
    expect(data.transfers).toEqual([
      { flight: "TK2174", destination: "ESB", cls: "C", pax: 1, bags: 1, weight: 10 },
      { flight: "TK720", destination: "BOM", cls: "Y", pax: 2, bags: 1, weight: 11 },
      { flight: "TK730", destination: "CMB", cls: "Y", pax: 2, bags: 2, weight: 36 },
      { flight: "TK738", destination: "SEZ", cls: "Y", pax: 4, bags: 3, weight: 50 },
      { flight: "TK758", destination: "DXB", cls: "Y", pax: 3, bags: 3, weight: 70 },
      { flight: "TK760", destination: "DXB", cls: "Y", pax: 1, bags: 1, weight: 13 },
      { flight: "TK812", destination: "AMM", cls: "Y", pax: 2, bags: 2, weight: 37 },
      { flight: "TK868", destination: "AUH", cls: "Y", pax: 2, bags: 2, weight: 32 },
    ]);
  });
});

describe("no name anywhere", () => {
  for (const [name, text] of [
    ["the Lufthansa PSM", PSM_LH],
    ["the Turkish PSM", PSM_TK],
    ["the Turkish PTM", PTM_TK],
  ] as const) {
    it(`stores and shows nothing personal of ${name}`, () => {
      const all = everything(text, "QU BUDKKXH\nMINTA/ELEK SENT THIS");
      for (const token of PERSONAL) expect(all, token).not.toContain(token);
    });
  }

  it("does not quote a line it cannot read, nor a broken header", () => {
    const stray = PSM_LH.replace("WCHR 001C 000M", "WCHR 001C 000M\n1KOVACS/JANOS 12C");
    const brokenHeader = PTM_TK.replace("TK1034/26SEP BUDIST PART2", "TK1034/26SEP KOVACS/JANOS");
    for (const text of [stray, brokenHeader]) {
      const all = everything(text);
      for (const token of PERSONAL) expect(all, token).not.toContain(token);
    }
    expect(parse(stray).parsed.warnings).toEqual([{ code: "unreadLines", params: { count: 1 } }]);
    expect(parse(brokenHeader).parsed.warnings).toEqual([{ code: "unreadHeader" }]);
  });

  it("stores the counts in place of the raw text, and knows a resent one by them", () => {
    const { raw, parsed } = parse(PTM_TK);
    const stored = storedForm(raw, parsed, "QU BUDKKXH");
    expect(stored.envelope).toBeNull();
    expect(stored.rawText.split("\n").slice(0, 3)).toEqual(["PTM", "TK1034/26SEP BUDIST PART2", "TK2174 ESB 1C 1B10K"]);
    const resent = parse(PTM_TK.replace(/\n/g, "  \n"));
    expect(storedForm(resent.raw, resent.parsed, null).hashSource).toBe(stored.hashSource);
  });
});

describe("matching PSM and PTM", () => {
  const flights: MatchFlight[] = [
    {
      id: "lh",
      airlineId: "lh",
      inboundFlightNumber: "LH1338",
      outboundFlightNumber: null,
      arrivalFlightDate: "2026-09-27",
      departureFlightDate: null,
      origin: "FRA",
      destination: null,
      arrivalRegistration: null,
      departureRegistration: null,
    },
    {
      id: "tk",
      airlineId: "tk",
      inboundFlightNumber: null,
      outboundFlightNumber: "TK1034",
      arrivalFlightDate: null,
      departureFlightDate: "2026-09-26",
      origin: null,
      destination: "IST",
      arrivalRegistration: null,
      departureRegistration: null,
    },
  ];
  const airlines = [
    { id: "lh", code: "LH" },
    { id: "tk", code: "TK" },
  ];
  const match = (text: string, at: string) => matchMessage(parse(text).parsed as ParsedMessage, new Date(at), airlines, flights);

  it("hangs the Lufthansa PSM on the arrival, and the Turkish PSM and PTM on the departure", () => {
    expect(match(PSM_LH, "2026-09-27T09:00:00Z")).toMatchObject({ matched: true, flightId: "lh", key: { part: "ARRIVAL_PART", operatingDay: "2026-09-27" } });
    expect(match(PSM_TK, "2026-09-26T13:00:00Z")).toMatchObject({ matched: true, flightId: "tk", key: { part: "DEPARTURE_PART" } });
    expect(match(PTM_TK, "2026-09-26T13:00:00Z")).toMatchObject({ matched: true, flightId: "tk", key: { part: "DEPARTURE_PART" } });
  });

  it("takes the year nearest to the receipt", () => {
    // Received on the 2nd of January: "31DEC" is last year's.
    const late = PSM_LH.replace("27SEP", "31DEC");
    expect(match(late, "2027-01-02T08:00:00Z")).toMatchObject({ key: { operatingDay: "2026-12-31" } });
  });
});
