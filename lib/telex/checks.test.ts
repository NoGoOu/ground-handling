import { describe, expect, it } from "vitest";
import { checkCpm, checkDelays, checkLdm, compareLdmCpm, compareUcmCpm } from "@/lib/telex/checks";
import type { CpmData } from "@/lib/telex/cpm";
import type { LdmData } from "@/lib/telex/ldm";
import type { MvtData } from "@/lib/telex/mvt";
import { parseMessage } from "@/lib/telex/parse";
import { SAMPLES } from "@/lib/telex/samples.fixture";
import { splitMessages, type SupportedType } from "@/lib/telex/split";
import type { UcmData } from "@/lib/telex/ucm";
import { delayMinutes } from "@/lib/turnaround";

function data<T>(text: string): T {
  const [message] = splitMessages(text).messages;
  return parseMessage(message as typeof message & { type: SupportedType }).data as T;
}

describe("checks of one message", () => {
  it("finds the samples consistent", () => {
    expect(checkLdm(data<LdmData>(SAMPLES.LDM_P7))).toEqual([]);
    expect(checkLdm(data<LdmData>(SAMPLES.LDM_EW))).toEqual([]);
    expect(checkCpm(data<CpmData>(SAMPLES.CPM_P7))).toEqual([]);
    // TOW 346078 = ZFW 234408 + take-off fuel 111670, and the positions give 92404.
    expect(checkCpm(data<CpmData>(SAMPLES.CPM_CZ))).toEqual([]);
  });

  it("warns when the LDM's parts do not add up", () => {
    const ldm = data<LdmData>(SAMPLES.LDM_EW.replace("T825", "T900").replace("82/52", "82/53"));
    expect(checkLdm(ldm)).toEqual([
      { code: "ldmLoadSum", params: { destination: "STR", total: 900, sum: 825 } },
      { code: "ldmPaxSum", params: { destination: "STR", pax: 134, sum: 135 } },
    ]);
  });

  it("warns when the CPM's positions or its take-off weight do not add up", () => {
    const cpm = data<CpmData>(SAMPLES.CPM_CZ.replace("-BLK/108/BUD/C", "-BLK/100/BUD/C").replace("TOW=346078", "TOW=346000"));
    expect(checkCpm(cpm)).toEqual([
      { code: "cpmWeightSum", params: { total: 92404, sum: 92396 } },
      { code: "cpmTakeOffWeight", params: { tow: 346000, zfw: 234408, fuel: 111670 } },
    ]);
  });
});

describe("checks across the messages of a flight part", () => {
  it("finds the LDM and the CPM of P7 5535/16 alike, deck by deck and hold by hold", () => {
    expect(compareLdmCpm(data<LdmData>(SAMPLES.LDM_P7), data<CpmData>(SAMPLES.CPM_P7))).toEqual([]);
    const moved = data<CpmData>(SAMPLES.CPM_P7.replace("-3/OSR/351/E.FKT", "-2/OSR/351/E.FKT"));
    expect(compareLdmCpm(data<LdmData>(SAMPLES.LDM_P7), moved)).toEqual([
      { code: "ldmCpmHold", params: { hold: "2", ldm: 0, cpm: 351 } },
      { code: "ldmCpmHold", params: { hold: "3", ldm: 351, cpm: 0 } },
    ]);
  });

  it("flags the known error of P7 5535/16: the UCM and the CPM disagree on the base pallet", () => {
    // UCM: PAG59334JG is a base (E) and PAG72809AGH empty (X); CPM: PAG72809AGH is the base in A9.
    expect(compareUcmCpm(data<UcmData>(SAMPLES.UCM_P7_OUT), data<CpmData>(SAMPLES.CPM_P7))).toEqual([
      { code: "ucmBaseNotInCpm", params: { uld: "PAG59334JG" } },
      { code: "cpmStackNotInUcm", params: { uld: "PAG72809AGH", position: "A9" } },
      { code: "ucmEmptyInCpm", params: { uld: "PAG72809AGH", position: "A9" } },
    ]);
  });

  it("finds the UCM and the CPM alike once the typo is fixed", () => {
    const fixed = SAMPLES.UCM_P7_OUT.replace("PAG59334JG/OSR/E.PAG72809AGH/OSR/X", "PAG59334JG/OSR/X.PAG72809AGH/OSR/E");
    expect(compareUcmCpm(data<UcmData>(fixed), data<CpmData>(SAMPLES.CPM_P7))).toEqual([]);
  });
});

describe("delay codes against the delay", () => {
  it("flags the known error of ET 3365/12: 76 minutes of codes for a delay of days", () => {
    const mvt = data<MvtData>(SAMPLES.MVT_ET);
    // Scheduled on the 12th, off-block on the 17th at 07:16.
    const delay = delayMinutes(new Date("2026-09-12T06:00:00Z"), new Date("2026-09-17T07:16:00Z"));
    expect(checkDelays(mvt.delays, delay)).toEqual([{ code: "delaySum", params: { sum: 76, delay: 7276 } }]);
  });

  it("is silent when the codes add up, and while there is no ATD", () => {
    expect(checkDelays([{ minutes: 40 }, { minutes: 36 }], 76)).toEqual([]);
    expect(checkDelays([], 0)).toEqual([]);
    expect(checkDelays([{ minutes: 40 }], null)).toEqual([]);
  });

  it("warns about a delay without codes", () => {
    expect(checkDelays([], 25)).toEqual([{ code: "delaySum", params: { sum: 0, delay: 25 } }]);
  });
});
