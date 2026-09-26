import { parseDayTime, parseDuration, type DayTime } from "./day-time";
import { warn, type TelexWarning } from "./warnings";

// MVT, the movement message (docs/messages.md, "MVT"): AD off-block/airborne,
// AA touchdown/on-block (read like AD, approved decision), EA estimated
// arrival and its destination, DL delay codes and their durations, SI.

export interface MvtData {
  /** The header's station: where the movement happened. */
  station: string | null;
  /** AD: off-block (the ATD) and airborne. */
  departure: { offBlock: DayTime; airborne: DayTime | null } | null;
  /** AA: touchdown and on-block (the ATA). */
  arrival: { touchdown: DayTime | null; onBlock: DayTime } | null;
  /** EA: estimated arrival at the destination. */
  estimatedArrival: { time: DayTime; destination: string | null } | null;
  /** DL: codes with their minutes; minutes null when the message gives none. */
  delays: { code: string; minutes: number | null }[];
  si: string[];
}

const DELAY_CODE = /^(\d{2}[A-Z]?|[A-Z]{2})$/;

/** "68/36/0040/0036": the codes, then their durations. */
function parseDelays(text: string, line: string, warnings: TelexWarning[]): MvtData["delays"] {
  const tokens = text.split("/").map((t) => t.trim()).filter(Boolean);
  const durations = tokens.filter((t) => /^\d{4}$/.test(t));
  const codes = tokens.filter((t) => !/^\d{4}$/.test(t));
  if (codes.length === 0 || codes.some((code) => !DELAY_CODE.test(code))) warnings.push(warn("badDelay", { line }));
  else if (durations.length > 0 && durations.length !== codes.length) warnings.push(warn("delayCount", { line }));
  return codes
    .filter((code) => DELAY_CODE.test(code))
    .map((code, i) => ({ code, minutes: durations[i] === undefined ? null : parseDuration(durations[i]) }));
}

/** "162036/162049" → the two times; the second may be missing. */
function timePair(text: string): [DayTime, DayTime | null] | null {
  const [first, second] = text.split("/");
  const a = parseDayTime(first);
  const b = second ? parseDayTime(second) : null;
  return a && (!second || b) ? [a, b] : null;
}

const MOVEMENT = /^(AD|AA)([\d/]+)(?:\s+EA(\d{4,6})(?:\s+([A-Z]{3}))?)?$/;
const ESTIMATE = /^EA(\d{4,6})(?:\s+([A-Z]{3}))?$/;

export function parseMvt(fields: readonly string[], body: readonly string[]): { data: MvtData; warnings: TelexWarning[] } {
  const warnings: TelexWarning[] = [];
  const data: MvtData = {
    station: fields.find((f) => /^[A-Z]{3}$/.test(f)) ?? null,
    departure: null,
    arrival: null,
    estimatedArrival: null,
    delays: [],
    si: [],
  };
  const estimate = (time: string, destination: string | undefined, line: string) => {
    const parsed = parseDayTime(time);
    if (parsed) data.estimatedArrival = { time: parsed, destination: destination ?? null };
    else warnings.push(warn("badTime", { line }));
  };

  let inSi = false;
  for (const raw of body) {
    const line = raw.trim().toUpperCase().replace(/\s+/g, " ");
    const movement = line.match(MOVEMENT);
    const estimateOnly = line.match(ESTIMATE);
    if (/^SI\b/.test(line)) {
      inSi = true;
      const text = raw.trim().slice(2).trim();
      if (text) data.si.push(text);
    } else if (line.startsWith("DL")) {
      inSi = false;
      data.delays.push(...parseDelays(line.slice(2), raw.trim(), warnings));
    } else if (movement) {
      inSi = false;
      const pair = timePair(movement[2]);
      if (!pair) warnings.push(warn("badTime", { line: raw.trim() }));
      else if (movement[1] === "AD") data.departure = { offBlock: pair[0], airborne: pair[1] };
      // "AA touchdown/on-block"; with one time only, it is the on-block.
      else data.arrival = pair[1] ? { touchdown: pair[0], onBlock: pair[1] } : { touchdown: null, onBlock: pair[0] };
      if (movement[3]) estimate(movement[3], movement[4], raw.trim());
    } else if (estimateOnly) {
      inSi = false;
      estimate(estimateOnly[1], estimateOnly[2], raw.trim());
    } else if (inSi) {
      // SI may run over more lines.
      data.si.push(raw.trim());
    } else {
      warnings.push(warn("unknownLine", { line: raw.trim() }));
    }
  }
  return { data, warnings };
}
