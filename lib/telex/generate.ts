import { formatDuration } from "./day-time";
import { HOME_STATION } from "./match";
import { warn, type TelexWarning } from "./warnings";

// The departure MVT we send (docs/messages.md, "MVT előállítása"): header
// "flight/day.registration.BUD", "AD off-block/airborne EA ddhhmm DEST", "DL"
// with at most two codes, then SI. Our own parser must read the same values
// back. The arrival (AA) and the correction MVT wait for samples.

export interface DepartureMvtInput {
  /** As our flights store it, e.g. "ZZ1102". */
  flightNumber: string;
  /** "YYYY-MM-DD": the header carries its day. */
  operatingDay: string;
  registration: string;
  /** The effective off-block (ATD). */
  offBlock: Date;
  airborne: Date | null;
  estimatedArrival: Date | null;
  destination: string | null;
  delays: readonly { code: string; minutes: number }[];
  si: string | null;
}

/** The sample format carries at most two delay codes. */
export const MAX_MVT_DELAY_CODES = 2;
const MAX_DL_MINUTES = 99 * 60 + 59;

const pad = (n: number) => String(n).padStart(2, "0");
/** "ddhhmm" in UTC. */
const dayTime = (date: Date) => `${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}`;

/** Type B text: capitals, and only the characters a telex carries. */
export function telexText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 .,/()?:'=+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function generateDepartureMvt(input: DepartureMvtInput): { text: string; warnings: TelexWarning[] } {
  const warnings: TelexWarning[] = [];
  const day = pad(Number(input.operatingDay.slice(8, 10)));
  const lines = ["MVT", `${input.flightNumber}/${day}.${input.registration}.${HOME_STATION}`];

  let movement = `AD${dayTime(input.offBlock)}`;
  if (input.airborne) movement += `/${dayTime(input.airborne)}`;
  if (input.estimatedArrival && input.destination) movement += ` EA${dayTime(input.estimatedArrival)} ${input.destination}`;
  lines.push(movement);

  if (input.delays.length > 0) {
    const shown = input.delays.slice(0, MAX_MVT_DELAY_CODES);
    if (input.delays.length > MAX_MVT_DELAY_CODES) {
      warnings.push(warn("tooManyDelayCodes", { count: input.delays.length, max: MAX_MVT_DELAY_CODES }));
    }
    // "hhmm" holds at most 99:59.
    for (const d of shown) if (d.minutes > MAX_DL_MINUTES) warnings.push(warn("delayTooLong", { code: d.code, minutes: d.minutes }));
    const durations = shown.map((d) => formatDuration(Math.min(d.minutes, MAX_DL_MINUTES)));
    lines.push(`DL${[...shown.map((d) => d.code), ...durations].join("/")}`);
  }
  const si = input.si ? telexText(input.si) : "";
  if (si) lines.push(`SI ${si}`);
  return { text: lines.join("\n"), warnings };
}
