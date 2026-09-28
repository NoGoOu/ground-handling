import { warn, type TelexWarning } from "./warnings";

// Eurocontrol slot messages in ADEXP (docs/messages.md, "Slotüzenetek"): one
// "-KEY value" per line, the first one "-TITLE". SAM allocates a slot (CTOT),
// SRM revises it (NEWCTOT). Other titles are recognised and kept raw. No
// personal data: the raw text stays.

export interface SlotData {
  /** SAM, SRM, or another title we do not process yet. */
  title: string;
  /** The call sign, e.g. RYR48VM; not the flight number. */
  arcid: string | null;
  /** The flight plan id: later messages of the flight come with the same. */
  ifplid: string | null;
  /** ICAO codes of the departure and the destination airport. */
  adep: string | null;
  ades: string | null;
  /** EOBD as "YYYY-MM-DD". */
  eobd: string | null;
  /** EOBT: the planned off-block, "hhmm" UTC. */
  eobt: string | null;
  /** CTOT (SAM) or NEWCTOT (SRM): the slot, "hhmm" UTC. */
  ctot: string | null;
  /** TAXITIME in minutes. */
  taxiMinutes: number | null;
  regulations: string[];
  /** REGCAUSE: the cause and its IATA delay code, e.g. "CE 81". */
  cause: { reason: string; delayCode: string | null } | null;
  /** Everything else, as given (TTO and others). */
  other: string[];
}

/** The titles we process; the others are kept, marked as not processed. */
export const PROCESSED_SLOT_TITLES = ["SAM", "SRM"];

const hhmm = (value: string | undefined) => (value && /^\d{4}$/.test(value) && +value.slice(0, 2) < 24 && +value.slice(2) < 60 ? value : null);

export function parseAdexp(lines: readonly string[]): { data: SlotData; warnings: TelexWarning[] } {
  const data: SlotData = {
    title: "",
    arcid: null,
    ifplid: null,
    adep: null,
    ades: null,
    eobd: null,
    eobt: null,
    ctot: null,
    taxiMinutes: null,
    regulations: [],
    cause: null,
    other: [],
  };
  const warnings: TelexWarning[] = [];
  for (const raw of lines) {
    const line = raw.trim().toUpperCase();
    if (line === "") continue;
    const m = line.match(/^-([A-Z]+)\s*(.*)$/);
    if (!m) {
      data.other.push(raw.trim());
      continue;
    }
    const [, key, value] = m;
    // "-TTO -PTID IDOSA -TO 1359 -FL F342": a composite line, kept as given.
    if (value.startsWith("-")) {
      data.other.push(raw.trim());
      continue;
    }
    switch (key) {
      case "TITLE":
        data.title = value;
        break;
      case "ARCID":
        data.arcid = value;
        break;
      case "IFPLID":
        data.ifplid = value;
        break;
      case "ADEP":
        data.adep = value;
        break;
      case "ADES":
        data.ades = value;
        break;
      case "EOBD": {
        const d = value.match(/^(\d{2})(\d{2})(\d{2})$/);
        data.eobd = d ? `20${d[1]}-${d[2]}-${d[3]}` : null;
        if (!d) warnings.push(warn("slotBadField", { field: key }));
        break;
      }
      case "EOBT":
        data.eobt = hhmm(value);
        if (!data.eobt) warnings.push(warn("slotBadField", { field: key }));
        break;
      case "CTOT":
      case "NEWCTOT":
        data.ctot = hhmm(value);
        if (!data.ctot) warnings.push(warn("slotBadField", { field: key }));
        break;
      case "TAXITIME": {
        const time = hhmm(value);
        data.taxiMinutes = time ? +time.slice(0, 2) * 60 + +time.slice(2) : null;
        if (!time) warnings.push(warn("slotBadField", { field: key }));
        break;
      }
      case "REGUL":
        data.regulations.push(value);
        break;
      case "REGCAUSE": {
        const [reason, delayCode] = value.split(/\s+/);
        data.cause = { reason, delayCode: delayCode ?? null };
        break;
      }
      default:
        data.other.push(raw.trim());
    }
  }
  if (PROCESSED_SLOT_TITLES.includes(data.title)) {
    for (const [field, present] of [
      ["IFPLID", data.ifplid],
      ["ADEP", data.adep],
      ["ADES", data.ades],
      ["EOBD", data.eobd],
      ["EOBT", data.eobt],
      [data.title === "SRM" ? "NEWCTOT" : "CTOT", data.ctot],
    ] as const) {
      if (!present) warnings.push(warn("slotMissingField", { field }));
    }
  } else warnings.push(warn("slotNotProcessed", { title: data.title }));
  return { data, warnings };
}
